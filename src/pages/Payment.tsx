import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useLocation, useNavigate } from "react-router-dom";
import { CreditCard, Wallet, Building } from "lucide-react";
import { useState } from "react";
import { toast } from "@/hooks/use-toast";

const Payment = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { course, batch, fee } = location.state || {};
  const [paymentMethod, setPaymentMethod] = useState("card");

  const handlePayment = (e: React.FormEvent) => {
    e.preventDefault();
    toast({
      title: "Processing payment...",
      description: "Please wait while we confirm your payment.",
    });
    
    setTimeout(() => {
      navigate("/payment/success", { 
        state: { course, batch, fee, studentId: `${batch}` } 
      });
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header role="public" />
      
      <div className="container px-6 py-12">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Complete Payment</h1>
            <p className="text-muted-foreground">Secure payment powered by Knead & Frost</p>
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <form onSubmit={handlePayment}>
                <Card className="p-6 border-border/60 mb-6">
                  <h3 className="font-semibold mb-4">Payment Method</h3>
                  <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod}>
                    <div className="space-y-3">
                      <Label
                        htmlFor="card"
                        className="flex items-center gap-3 p-4 border border-border rounded-xl cursor-pointer hover:bg-accent/50"
                      >
                        <RadioGroupItem value="card" id="card" />
                        <CreditCard className="h-5 w-5 text-primary" />
                        <span className="font-medium">Credit / Debit Card</span>
                      </Label>
                      <Label
                        htmlFor="upi"
                        className="flex items-center gap-3 p-4 border border-border rounded-xl cursor-pointer hover:bg-accent/50"
                      >
                        <RadioGroupItem value="upi" id="upi" />
                        <Wallet className="h-5 w-5 text-primary" />
                        <span className="font-medium">UPI</span>
                      </Label>
                      <Label
                        htmlFor="netbanking"
                        className="flex items-center gap-3 p-4 border border-border rounded-xl cursor-pointer hover:bg-accent/50"
                      >
                        <RadioGroupItem value="netbanking" id="netbanking" />
                        <Building className="h-5 w-5 text-primary" />
                        <span className="font-medium">Net Banking</span>
                      </Label>
                    </div>
                  </RadioGroup>
                </Card>

                {paymentMethod === "card" && (
                  <Card className="p-6 border-border/60 mb-6">
                    <h3 className="font-semibold mb-4">Card Details</h3>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="cardNumber">Card Number</Label>
                        <Input
                          id="cardNumber"
                          placeholder="1234 5678 9012 3456"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="cardName">Cardholder Name</Label>
                        <Input
                          id="cardName"
                          placeholder="John Doe"
                          required
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="expiry">Expiry Date</Label>
                          <Input
                            id="expiry"
                            placeholder="MM/YY"
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="cvv">CVV</Label>
                          <Input
                            id="cvv"
                            placeholder="123"
                            type="password"
                            maxLength={3}
                            required
                          />
                        </div>
                      </div>
                    </div>
                  </Card>
                )}

                {paymentMethod === "upi" && (
                  <Card className="p-6 border-border/60 mb-6">
                    <h3 className="font-semibold mb-4">UPI Details</h3>
                    <div className="space-y-2">
                      <Label htmlFor="upiId">UPI ID</Label>
                      <Input
                        id="upiId"
                        placeholder="yourname@upi"
                        required
                      />
                    </div>
                  </Card>
                )}

                {paymentMethod === "netbanking" && (
                  <Card className="p-6 border-border/60 mb-6">
                    <h3 className="font-semibold mb-4">Select Bank</h3>
                    <div className="space-y-2">
                      <Label htmlFor="bank">Bank Name</Label>
                      <select
                        id="bank"
                        className="w-full h-10 px-3 rounded-md border border-input bg-background"
                        required
                      >
                        <option value="">Select your bank</option>
                        <option value="hdfc">HDFC Bank</option>
                        <option value="icici">ICICI Bank</option>
                        <option value="sbi">State Bank of India</option>
                        <option value="axis">Axis Bank</option>
                      </select>
                    </div>
                  </Card>
                )}

                <Button type="submit" size="lg" className="w-full">
                  Pay ₹{fee?.toLocaleString()}
                </Button>
              </form>
            </div>

            <div className="lg:col-span-1">
              <Card className="p-6 border-border/60 sticky top-6">
                <h3 className="font-semibold mb-4">Order Summary</h3>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Course</span>
                    <span className="font-medium">{course}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Batch</span>
                    <span className="font-medium">{batch}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Course Fee</span>
                    <span className="font-medium">₹{fee?.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">GST (18%)</span>
                    <span className="font-medium">₹{Math.round(fee * 0.18).toLocaleString()}</span>
                  </div>
                  <div className="border-t pt-3 flex justify-between">
                    <span className="font-semibold">Total Amount</span>
                    <span className="font-bold text-primary text-lg">
                      ₹{Math.round(fee * 1.18).toLocaleString()}
                    </span>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Payment;
