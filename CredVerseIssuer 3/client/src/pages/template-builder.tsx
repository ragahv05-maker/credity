import { Layout } from "@/components/layout/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useState, useCallback } from "react";
import { useLocation } from "wouter";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  useDraggable,
  useDroppable,
  closestCenter,
} from "@dnd-kit/core";
import {
  Save,
  ArrowLeft,
  Type,
  Image,
  QrCode,
  Calendar,
  FileSignature,
  Table,
  GripVertical,
  Trash2,
  Settings2,
} from "lucide-react";

// Field types available in the builder
const FIELD_TYPES = [
  { id: "text", label: "Text Field", icon: Type },
  { id: "image", label: "Image/Logo", icon: Image },
  { id: "qrcode", label: "QR Code", icon: QrCode },
  { id: "date", label: "Date Field", icon: Calendar },
  { id: "signature", label: "Signature", icon: FileSignature },
  { id: "table", label: "Table/Grid", icon: Table },
];

interface TemplateField {
  id: string;
  type: string;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  properties: Record<string, any>;
}

// Draggable field component for the palette
function DraggableFieldType({ type }: { type: (typeof FIELD_TYPES)[0] }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: `palette-${type.id}`,
      data: { type: type.id, fromPalette: true },
    });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        opacity: isDragging ? 0.5 : 1,
      }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg cursor-grab hover:bg-muted transition-colors"
    >
      <type.icon className="h-4 w-4 text-muted-foreground" />
      <span className="text-sm">{type.label}</span>
    </div>
  );
}

// Field on canvas
function CanvasField({
  field,
  isSelected,
  onSelect,
  onDelete,
}: {
  field: TemplateField;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: field.id,
      data: { type: field.type, fromPalette: false, field },
    });

  const style: React.CSSProperties = {
    position: "absolute",
    left: field.x,
    top: field.y,
    width: field.width,
    height: field.height,
    transform: transform
      ? `translate3d(${transform.x}px, ${transform.y}px, 0)`
      : undefined,
    opacity: isDragging ? 0.7 : 1,
  };

  const IconComponent =
    FIELD_TYPES.find((t) => t.id === field.type)?.icon || Type;

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={onSelect}
      className={`
        border-2 rounded-lg p-2 cursor-move bg-white/90 transition-all
        ${isSelected ? "border-blue-500 ring-2 ring-blue-200" : "border-dashed border-gray-300 hover:border-gray-400"}
      `}
    >
      <div
        className="flex items-center justify-between"
        {...listeners}
        {...attributes}
      >
        <div className="flex items-center gap-2">
          <GripVertical className="h-4 w-4 text-gray-400" />
          <IconComponent className="h-4 w-4 text-blue-600" />
          <span className="text-xs font-medium">{field.label}</span>
        </div>
        {isSelected && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="text-red-500 hover:text-red-700"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        )}
      </div>
      <div className="mt-2 text-xs text-gray-500 bg-gray-50 rounded p-2">
        {field.type === "text" && (
          <div className="italic">Sample Text Content</div>
        )}
        {field.type === "image" && <div className="text-center">📷 Image</div>}
        {field.type === "qrcode" && (
          <div className="text-center">⬜ QR Code</div>
        )}
        {field.type === "date" && (
          <div className="italic">{new Date().toLocaleDateString()}</div>
        )}
        {field.type === "signature" && (
          <div className="text-center border-t border-gray-300 pt-1">
            Signature
          </div>
        )}
        {field.type === "table" && <div className="text-center">📊 Table</div>}
      </div>
    </div>
  );
}

// Canvas drop zone
function Canvas({
  fields,
  selectedFieldId,
  onSelectField,
  onDeleteField,
  width,
  height,
  backgroundColor,
}: {
  fields: TemplateField[];
  selectedFieldId: string | null;
  onSelectField: (id: string | null) => void;
  onDeleteField: (id: string) => void;
  width: number;
  height: number;
  backgroundColor: string;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: "canvas",
  });

  return (
    <div
      ref={setNodeRef}
      className={`relative border-2 rounded-lg shadow-inner transition-colors overflow-hidden ${isOver ? "border-blue-400 bg-blue-50/30" : "border-gray-200"}`}
      style={{
        width: Math.min(width * 0.8, 700),
        height: Math.min(height * 0.8, 500),
        backgroundColor,
      }}
      onClick={() => onSelectField(null)}
    >
      {/* Grid pattern */}
      <div
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage:
            "linear-gradient(90deg, #3B82F6 1px, transparent 1px), linear-gradient(180deg, #3B82F6 1px, transparent 1px)",
          backgroundSize: "20px 20px",
        }}
      />

      {fields.map((field) => (
        <CanvasField
          key={field.id}
          field={field}
          isSelected={selectedFieldId === field.id}
          onSelect={() => onSelectField(field.id)}
          onDelete={() => onDeleteField(field.id)}
        />
      ))}

      {fields.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center text-gray-400">
          <div className="text-center">
            <p className="text-lg font-medium">Drop fields here</p>
            <p className="text-sm">Drag fields from the left panel</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default function TemplateBuilder() {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();

  // Template state
  const [templateName, setTemplateName] = useState("New Template");
  const [templateCategory, setTemplateCategory] = useState("Education");
  const [templateType, setTemplateType] = useState("A4 Landscape");
  const [backgroundColor, setBackgroundColor] = useState("#ffffff");
  const [width] = useState(842);
  const [height] = useState(595);

  // Canvas state
  const [fields, setFields] = useState<TemplateField[]>([]);
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);

  // Selected field for properties panel
  const selectedField = fields.find((f) => f.id === selectedFieldId);

  // Generate unique ID
  const generateId = () =>
    `field-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  // Handle drag start
  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  // Handle drag end
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const activeData = active.data.current;

    // If dropped on canvas
    if (over.id === "canvas") {
      if (activeData?.fromPalette) {
        // Create new field
        const fieldType = activeData.type;
        const type = FIELD_TYPES.find((t) => t.id === fieldType);
        const newField: TemplateField = {
          id: generateId(),
          type: fieldType,
          label: type?.label || "Field",
          x: 50,
          y: 50 + fields.length * 60,
          width: fieldType === "table" ? 300 : 180,
          height: fieldType === "table" ? 120 : 60,
          properties: {},
        };
        setFields([...fields, newField]);
        setSelectedFieldId(newField.id);
      } else if (activeData?.field) {
        // Move existing field
        const delta = event.delta;
        setFields(
          fields.map((f) =>
            f.id === active.id
              ? { ...f, x: f.x + delta.x, y: f.y + delta.y }
              : f,
          ),
        );
      }
    }
  };

  // Delete field
  const handleDeleteField = (id: string) => {
    setFields(fields.filter((f) => f.id !== id));
    if (selectedFieldId === id) {
      setSelectedFieldId(null);
    }
  };

  // Update field property
  const updateFieldProperty = (key: string, value: any) => {
    if (!selectedFieldId) return;
    setFields(
      fields.map((f) =>
        f.id === selectedFieldId ? { ...f, [key]: value } : f,
      ),
    );
  };

  // Save template mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/v1/template-designs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": (import.meta as any).env?.VITE_API_KEY || "",
        },
        body: JSON.stringify({
          name: templateName,
          category: templateCategory,
          type: templateType,
          backgroundColor,
          width,
          height,
          fields,
        }),
      });
      if (!response.ok) throw new Error("Failed to save template");
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Template saved",
        description: "Your template has been saved successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["template-designs"] });
      navigate("/templates");
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save template.",
        variant: "destructive",
      });
    },
  });

  return (
    <Layout>
      <DndContext
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate("/templates")}
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <Input
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  className="text-xl font-bold border-none p-0 h-auto focus-visible:ring-0"
                />
                <p className="text-sm text-muted-foreground">
                  Drag and drop fields to design your credential
                </p>
              </div>
            </div>
            <Button
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending}
            >
              <Save className="mr-2 h-4 w-4" />
              {saveMutation.isPending ? "Saving..." : "Save Template"}
            </Button>
          </div>

          <div className="grid grid-cols-12 gap-4">
            {/* Left Sidebar - Field Palette */}
            <div className="col-span-2">
              <Card>
                <CardHeader className="py-3">
                  <CardTitle className="text-sm">Fields</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {FIELD_TYPES.map((type) => (
                    <DraggableFieldType key={type.id} type={type} />
                  ))}
                </CardContent>
              </Card>
            </div>

            {/* Center - Canvas */}
            <div className="col-span-7 flex justify-center">
              <Canvas
                fields={fields}
                selectedFieldId={selectedFieldId}
                onSelectField={setSelectedFieldId}
                onDeleteField={handleDeleteField}
                width={width}
                height={height}
                backgroundColor={backgroundColor}
              />
            </div>

            {/* Right Sidebar - Properties */}
            <div className="col-span-3">
              <Card>
                <CardHeader className="py-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Settings2 className="h-4 w-4" />
                    Properties
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Template Properties */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      Template
                    </h4>
                    <div className="space-y-2">
                      <Label className="text-xs">Category</Label>
                      <Select
                        value={templateCategory}
                        onValueChange={setTemplateCategory}
                      >
                        <SelectTrigger className="h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Education">Education</SelectItem>
                          <SelectItem value="Healthcare">Healthcare</SelectItem>
                          <SelectItem value="Corporate">Corporate</SelectItem>
                          <SelectItem value="Manufacturing">
                            Manufacturing
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">Size</Label>
                      <Select
                        value={templateType}
                        onValueChange={setTemplateType}
                      >
                        <SelectTrigger className="h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="A4 Landscape">
                            A4 Landscape
                          </SelectItem>
                          <SelectItem value="A4 Portrait">
                            A4 Portrait
                          </SelectItem>
                          <SelectItem value="Letter">Letter</SelectItem>
                          <SelectItem value="ID Card">ID Card</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">Background</Label>
                      <div className="flex gap-2">
                        <Input
                          type="color"
                          value={backgroundColor}
                          onChange={(e) => setBackgroundColor(e.target.value)}
                          className="w-10 h-8 p-0 border-none"
                        />
                        <Input
                          value={backgroundColor}
                          onChange={(e) => setBackgroundColor(e.target.value)}
                          className="h-8 font-mono text-xs"
                        />
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Selected Field Properties */}
                  {selectedField ? (
                    <div className="space-y-3">
                      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        Selected: {selectedField.label}
                      </h4>
                      <div className="space-y-2">
                        <Label className="text-xs">Label</Label>
                        <Input
                          value={selectedField.label}
                          onChange={(e) =>
                            updateFieldProperty("label", e.target.value)
                          }
                          className="h-8"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <Label className="text-xs">Width</Label>
                          <Input
                            type="number"
                            value={selectedField.width}
                            onChange={(e) =>
                              updateFieldProperty(
                                "width",
                                parseInt(e.target.value),
                              )
                            }
                            className="h-8"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Height</Label>
                          <Input
                            type="number"
                            value={selectedField.height}
                            onChange={(e) =>
                              updateFieldProperty(
                                "height",
                                parseInt(e.target.value),
                              )
                            }
                            className="h-8"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <Label className="text-xs">X Position</Label>
                          <Input
                            type="number"
                            value={Math.round(selectedField.x)}
                            onChange={(e) =>
                              updateFieldProperty("x", parseInt(e.target.value))
                            }
                            className="h-8"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Y Position</Label>
                          <Input
                            type="number"
                            value={Math.round(selectedField.y)}
                            onChange={(e) =>
                              updateFieldProperty("y", parseInt(e.target.value))
                            }
                            className="h-8"
                          />
                        </div>
                      </div>
                      <Button
                        variant="destructive"
                        size="sm"
                        className="w-full"
                        onClick={() => handleDeleteField(selectedField.id)}
                      >
                        <Trash2 className="mr-2 h-3 w-3" />
                        Delete Field
                      </Button>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground text-center py-4">
                      Select a field to edit its properties
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        {/* Drag overlay */}
        <DragOverlay>
          {activeId && activeId.startsWith("palette-") && (
            <div className="flex items-center gap-2 p-3 bg-white border rounded-lg shadow-lg">
              {(() => {
                const type = FIELD_TYPES.find(
                  (t) => `palette-${t.id}` === activeId,
                );
                if (!type) return null;
                return (
                  <>
                    <type.icon className="h-4 w-4 text-blue-600" />
                    <span className="text-sm font-medium">{type.label}</span>
                  </>
                );
              })()}
            </div>
          )}
        </DragOverlay>
      </DndContext>
    </Layout>
  );
}
