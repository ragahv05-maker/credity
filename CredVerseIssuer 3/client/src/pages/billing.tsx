import { Layout } from "@/components/layout/Layout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  CreditCard,
  CheckCircle,
  AlertCircle,
  Download,
  Calendar,
  Zap,
  Building,
  Users,
  FileCheck,
  ExternalLink,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

export default function Billing() {
  const currentPlan = {
    name: "Enterprise",
    price: "$499",
    period: "month",
    credentials: 5000,
    credentialsUsed: 2847,
    team: 25,
    teamUsed: 4,
    features: [
      "Unlimited templates",
      "API access",
      "Priority support",
      "Custom branding",
      "DigiLocker integration",
    ],
  };

  const invoices = [
    {
      id: "INV-2024-012",
      date: "Dec 1, 2024",
      amount: "$499.00",
      status: "Paid",
    },
    {
      id: "INV-2024-011",
      date: "Nov 1, 2024",
      amount: "$499.00",
      status: "Paid",
    },
    {
      id: "INV-2024-010",
      date: "Oct 1, 2024",
      amount: "$499.00",
      status: "Paid",
    },
    {
      id: "INV-2024-009",
      date: "Sep 1, 2024",
      amount: "$499.00",
      status: "Paid",
    },
  ];

  const plans = [
    {
      name: "Starter",
      price: "$49",
      credentials: 500,
      team: 3,
      current: false,
      features: ["Basic templates", "Email support", "Standard verification"],
    },
    {
      name: "Professional",
      price: "$199",
      credentials: 2000,
      team: 10,
      current: false,
      features: ["Custom templates", "API access", "Priority support"],
    },
    {
      name: "Enterprise",
      price: "$499",
      credentials: 5000,
      team: 25,
      current: true,
      features: [
        "Unlimited templates",
        "Dedicated support",
        "Custom integrations",
      ],
    },
  ];

  const credentialPercentage =
    (currentPlan.credentialsUsed / currentPlan.credentials) * 100;
  const teamPercentage = (currentPlan.teamUsed / currentPlan.team) * 100;

  return (
    <Layout>
      <div className="max-w-6xl mx-auto space-y-8">
        <div>
          <h2 className="text-3xl font-heading font-bold tracking-tight">
            Billing & Plans
          </h2>
          <p className="text-muted-foreground mt-1">
            Manage your subscription and billing details.
          </p>
        </div>

        {/* Current Plan Overview */}
        <Card className="border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-blue-600" />
                  Current Plan: {currentPlan.name}
                </CardTitle>
                <CardDescription>
                  Your subscription renews on January 1, 2025
                </CardDescription>
              </div>
              <div className="text-right">
                <p className="text-3xl font-bold text-blue-600">
                  {currentPlan.price}
                </p>
                <p className="text-sm text-muted-foreground">
                  per {currentPlan.period}
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 md:grid-cols-2">
              {/* Credentials Usage */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <FileCheck className="h-4 w-4 text-muted-foreground" />
                    Credentials Issued
                  </span>
                  <span className="font-medium">
                    {currentPlan.credentialsUsed.toLocaleString()} /{" "}
                    {currentPlan.credentials.toLocaleString()}
                  </span>
                </div>
                <Progress value={credentialPercentage} className="h-2" />
                <p className="text-xs text-muted-foreground">
                  {Math.round(100 - credentialPercentage)}% remaining this month
                </p>
              </div>

              {/* Team Usage */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    Team Members
                  </span>
                  <span className="font-medium">
                    {currentPlan.teamUsed} / {currentPlan.team}
                  </span>
                </div>
                <Progress value={teamPercentage} className="h-2" />
                <p className="text-xs text-muted-foreground">
                  {currentPlan.team - currentPlan.teamUsed} seats available
                </p>
              </div>
            </div>
          </CardContent>
          <CardFooter className="border-t bg-white/50 gap-3">
            <Button variant="outline" size="sm">
              Change Plan
            </Button>
            <Button variant="outline" size="sm">
              Cancel Subscription
            </Button>
          </CardFooter>
        </Card>

        {/* Payment Method */}
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Payment Method
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded">
                    <CreditCard className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium">Visa ending in 4242</p>
                    <p className="text-sm text-muted-foreground">
                      Expires 12/2025
                    </p>
                  </div>
                </div>
                <Badge className="bg-green-100 text-green-700">Default</Badge>
              </div>
              <Button variant="outline" className="w-full mt-4">
                Update Payment Method
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building className="h-5 w-5" />
                Billing Address
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="p-4 border rounded-lg">
                <p className="font-medium">University of North</p>
                <p className="text-sm text-muted-foreground mt-1">
                  123 Academic Avenue
                  <br />
                  New Delhi, 110001
                  <br />
                  India
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  GST: 07AAACW1234A1Z5
                </p>
              </div>
              <Button variant="outline" className="w-full mt-4">
                Update Address
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Invoice History */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Invoice History
            </CardTitle>
            <CardDescription>
              Download your past invoices for your records.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {invoices.map((invoice) => (
                <div
                  key={invoice.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-muted rounded">
                      <FileCheck className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="font-medium">{invoice.id}</p>
                      <p className="text-sm text-muted-foreground">
                        {invoice.date}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <p className="font-medium">{invoice.amount}</p>
                    <Badge className="bg-green-100 text-green-700">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      {invoice.status}
                    </Badge>
                    <Button variant="ghost" size="icon">
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Available Plans */}
        <Card>
          <CardHeader>
            <CardTitle>Available Plans</CardTitle>
            <CardDescription>
              Compare plans and choose the best one for your organization.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 md:grid-cols-3">
              {plans.map((plan) => (
                <div
                  key={plan.name}
                  className={cn(
                    "p-6 rounded-xl border-2 transition-all",
                    plan.current
                      ? "border-blue-500 bg-blue-50/50 shadow-lg"
                      : "border-border hover:border-muted-foreground/50",
                  )}
                >
                  {plan.current && (
                    <Badge className="mb-3 bg-blue-600">Current Plan</Badge>
                  )}
                  <h3 className="text-xl font-bold">{plan.name}</h3>
                  <div className="mt-2">
                    <span className="text-3xl font-bold">{plan.price}</span>
                    <span className="text-muted-foreground">/month</span>
                  </div>
                  <Separator className="my-4" />
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      {plan.credentials.toLocaleString()} credentials/mo
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      {plan.team} team members
                    </li>
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <Button
                    className="w-full mt-6"
                    variant={plan.current ? "outline" : "default"}
                    disabled={plan.current}
                  >
                    {plan.current ? "Current Plan" : "Upgrade"}
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
