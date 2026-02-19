// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import { AccessControl } from "@openzeppelin/contracts/access/AccessControl.sol";
import { ReentrancyGuard } from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import { Pausable } from "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title CredVerseRegistry
 * @dev Secure credential registry with role-based access control and emergency pause
 * @notice This contract manages issuer registration, credential anchoring, and revocation
 */
contract CredVerseRegistry is AccessControl, ReentrancyGuard, Pausable {
    bytes32 public constant ISSUER_ROLE = keccak256("ISSUER_ROLE");

    struct Issuer {
        bool isRegistered;
        string did;
        string domain;
        bool isRevoked;
    }

    struct Anchor {
        bytes32 rootHash;
        uint256 timestamp;
        address submitter;
        bool exists;
    }

    mapping(address => Issuer) public issuers;
    mapping(bytes32 => Anchor) public anchors;
    mapping(bytes32 => bool) public revokedCredentials;

    event IssuerRegistered(address indexed issuerAddress, string did, string domain);
    event IssuerRevoked(address indexed issuerAddress, address indexed revokedBy, uint256 timestamp);
    event AnchorSubmitted(bytes32 indexed rootHash, address indexed submitter, uint256 timestamp);
    event CredentialRevoked(bytes32 indexed credentialHash, address indexed revoker, uint256 timestamp);

    error IssuerAlreadyRegistered(address issuerAddress);
    error IssuerNotRegistered(address issuerAddress);
    error IssuerIsRevoked(address issuerAddress);
    error AnchorAlreadyExists(bytes32 rootHash);
    error IssuerAlreadyRevoked(address issuerAddress);
    error CredentialAlreadyRevoked(bytes32 credentialHash);
    error CredentialNotAnchored(bytes32 credentialHash);
    error UnauthorizedCredentialRevocation(address caller, bytes32 credentialHash);
    error InvalidIssuerMetadata();
    error InvalidAddress();
    error InvalidHash();
    error ContractPaused();

    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    /**
     * @dev Pause the contract - only admin can call
     */
    function pause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _pause();
    }

    /**
     * @dev Unpause the contract - only admin can call
     */
    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }

    /**
     * @dev Modifier to check if issuer is active (registered and not revoked)
     */
    modifier onlyActiveIssuer() {
        if (!issuers[msg.sender].isRegistered) {
            revert IssuerNotRegistered(msg.sender);
        }
        if (issuers[msg.sender].isRevoked) {
            revert IssuerIsRevoked(msg.sender);
        }
        _;
    }

    /**
     * @dev Register a new issuer
     * @param _issuerAddress Address of the issuer to register
     * @param _did Decentralized Identifier of the issuer
     * @param _domain Domain associated with the issuer
     */
    function registerIssuer(
        address _issuerAddress, 
        string calldata _did, 
        string calldata _domain
    ) external onlyRole(DEFAULT_ADMIN_ROLE) nonReentrant whenNotPaused {
        if (_issuerAddress == address(0)) {
            revert InvalidAddress();
        }
        if (bytes(_did).length == 0 || bytes(_domain).length == 0) {
            revert InvalidIssuerMetadata();
        }
        if (issuers[_issuerAddress].isRegistered) {
            revert IssuerAlreadyRegistered(_issuerAddress);
        }
        
        issuers[_issuerAddress] = Issuer({
            isRegistered: true,
            did: _did,
            domain: _domain,
            isRevoked: false
        });
        _grantRole(ISSUER_ROLE, _issuerAddress);
        emit IssuerRegistered(_issuerAddress, _did, _domain);
    }

    /**
     * @dev Revoke an issuer's ability to anchor or revoke credentials
     * @param _issuerAddress Address of the issuer to revoke
     */
    function revokeIssuer(address _issuerAddress) external onlyRole(DEFAULT_ADMIN_ROLE) nonReentrant whenNotPaused {
        if (!issuers[_issuerAddress].isRegistered) {
            revert IssuerNotRegistered(_issuerAddress);
        }
        if (issuers[_issuerAddress].isRevoked) {
            revert IssuerAlreadyRevoked(_issuerAddress);
        }
        
        issuers[_issuerAddress].isRevoked = true;
        _revokeRole(ISSUER_ROLE, _issuerAddress);
        emit IssuerRevoked(_issuerAddress, msg.sender, block.timestamp);
    }

    /**
     * @dev Anchor a credential hash on-chain
     * @param _rootHash The hash of the credential to anchor
     */
    function anchorCredential(bytes32 _rootHash) external onlyRole(ISSUER_ROLE) onlyActiveIssuer nonReentrant whenNotPaused {
        if (_rootHash == bytes32(0)) {
            revert InvalidHash();
        }
        if (anchors[_rootHash].exists) {
            revert AnchorAlreadyExists(_rootHash);
        }
        
        anchors[_rootHash] = Anchor({
            rootHash: _rootHash,
            timestamp: block.timestamp,
            submitter: msg.sender,
            exists: true
        });
        emit AnchorSubmitted(_rootHash, msg.sender, block.timestamp);
    }

    /**
     * @dev Revoke a credential
     * @param _credentialHash The hash of the credential to revoke
     */
    function revokeCredential(bytes32 _credentialHash) external onlyRole(ISSUER_ROLE) onlyActiveIssuer nonReentrant whenNotPaused {
        if (_credentialHash == bytes32(0)) {
            revert InvalidHash();
        }
        if (!anchors[_credentialHash].exists) {
            revert CredentialNotAnchored(_credentialHash);
        }
        if (anchors[_credentialHash].submitter != msg.sender) {
            revert UnauthorizedCredentialRevocation(msg.sender, _credentialHash);
        }
        if (revokedCredentials[_credentialHash]) {
            revert CredentialAlreadyRevoked(_credentialHash);
        }
        revokedCredentials[_credentialHash] = true;
        emit CredentialRevoked(_credentialHash, msg.sender, block.timestamp);
    }

    /**
     * @dev Emergency admin revocation path for anchored credentials.
     *      Useful when an issuer is compromised or has been revoked and can no longer revoke.
     * @param _credentialHash The hash of the credential to revoke
     */
    function adminRevokeCredential(bytes32 _credentialHash) external onlyRole(DEFAULT_ADMIN_ROLE) nonReentrant whenNotPaused {
        if (_credentialHash == bytes32(0)) {
            revert InvalidHash();
        }
        if (!anchors[_credentialHash].exists) {
            revert CredentialNotAnchored(_credentialHash);
        }
        if (revokedCredentials[_credentialHash]) {
            revert CredentialAlreadyRevoked(_credentialHash);
        }

        revokedCredentials[_credentialHash] = true;
        emit CredentialRevoked(_credentialHash, msg.sender, block.timestamp);
    }

    /**
     * @dev Check if a credential is revoked
     * @param _credentialHash The hash of the credential to check
     * @return bool True if the credential is revoked
     */
    function isRevoked(bytes32 _credentialHash) external view returns (bool) {
        return revokedCredentials[_credentialHash];
    }

    /**
     * @dev Check if an anchor exists
     * @param _rootHash The hash to check
     * @return bool True if the anchor exists
     */
    function anchorExists(bytes32 _rootHash) external view returns (bool) {
        return anchors[_rootHash].exists;
    }

    /**
     * @dev Check if an issuer is active
     * @param _issuerAddress The issuer address to check
     * @return bool True if the issuer is registered and not revoked
     */
    function isActiveIssuer(address _issuerAddress) external view returns (bool) {
        return issuers[_issuerAddress].isRegistered && !issuers[_issuerAddress].isRevoked;
    }
}
