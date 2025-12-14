import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useLocation, Link } from "react-router-dom";
import { CheckCircle, Download, Home } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const PaymentSuccess = () => {
  const location = useLocation();
  const { course, batch, fee, studentId } = location.state || {};
  const { toast } = useToast();

  const transactionId = `TXN${Date.now()}`;
  const totalAmount = Math.round((fee || 0) * 1.18);
  const gstAmount = Math.round((fee || 0) * 0.18);
  const paymentDate = new Date().toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const generatePDFInvoice = () => {
    // Create invoice HTML content
    const invoiceContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Invoice - ${transactionId}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Segoe UI', Arial, sans-serif; padding: 40px; background: #f8f9fa; }
          .invoice { max-width: 800px; margin: 0 auto; background: white; padding: 40px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
          .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; border-bottom: 2px solid #d4a574; padding-bottom: 20px; }
          .logo { font-size: 28px; font-weight: bold; color: #d4a574; }
          .logo-sub { font-size: 12px; color: #666; }
          .invoice-title { text-align: right; }
          .invoice-title h2 { font-size: 32px; color: #333; margin-bottom: 5px; }
          .invoice-title p { color: #666; }
          .details { display: flex; justify-content: space-between; margin-bottom: 40px; }
          .details-section h3 { font-size: 14px; color: #999; margin-bottom: 10px; text-transform: uppercase; }
          .details-section p { color: #333; margin-bottom: 5px; }
          .items { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
          .items th { background: #f8f9fa; padding: 12px; text-align: left; border-bottom: 2px solid #e9ecef; font-weight: 600; color: #333; }
          .items td { padding: 12px; border-bottom: 1px solid #e9ecef; }
          .items tr:last-child td { border-bottom: none; }
          .amount-col { text-align: right; }
          .totals { margin-left: auto; width: 300px; }
          .totals-row { display: flex; justify-content: space-between; padding: 8px 0; }
          .totals-row.total { border-top: 2px solid #333; font-weight: bold; font-size: 18px; margin-top: 10px; padding-top: 15px; }
          .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e9ecef; text-align: center; color: #666; font-size: 12px; }
          .badge { display: inline-block; background: #28a745; color: white; padding: 4px 12px; border-radius: 20px; font-size: 12px; margin-top: 10px; }
        </style>
      </head>
      <body>
        <div class="invoice">
          <div class="header">
            <div>
              <div class="logo">🧁 Knead & Frost</div>
              <div class="logo-sub">Global Baking Academy</div>
            </div>
            <div class="invoice-title">
              <h2>INVOICE</h2>
              <p>${transactionId}</p>
              <span class="badge">PAID</span>
            </div>
          </div>
          
          <div class="details">
            <div class="details-section">
              <h3>Bill To</h3>
              <p><strong>Student ID: ${studentId || 'N/A'}</strong></p>
              <p>Enrolled Student</p>
            </div>
            <div class="details-section">
              <h3>Invoice Details</h3>
              <p><strong>Date:</strong> ${paymentDate}</p>
              <p><strong>Transaction ID:</strong> ${transactionId}</p>
              <p><strong>Payment Method:</strong> Razorpay</p>
            </div>
          </div>
          
          <table class="items">
            <thead>
              <tr>
                <th>Description</th>
                <th>Batch</th>
                <th class="amount-col">Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>${course || 'Course Enrollment'}</strong></td>
                <td>${batch || 'N/A'}</td>
                <td class="amount-col">₹${(fee || 0).toLocaleString()}</td>
              </tr>
            </tbody>
          </table>
          
          <div class="totals">
            <div class="totals-row">
              <span>Subtotal</span>
              <span>₹${(fee || 0).toLocaleString()}</span>
            </div>
            <div class="totals-row">
              <span>GST (18%)</span>
              <span>₹${gstAmount.toLocaleString()}</span>
            </div>
            <div class="totals-row total">
              <span>Total Paid</span>
              <span>₹${totalAmount.toLocaleString()}</span>
            </div>
          </div>
          
          <div class="footer">
            <p>Thank you for enrolling with Knead & Frost!</p>
            <p>For any queries, contact us at support@kneadandfrost.com</p>
          </div>
        </div>
      </body>
      </html>
    `;

    // Create blob and download
    const blob = new Blob([invoiceContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    
    // Open in new window for printing as PDF
    const printWindow = window.open(url, '_blank');
    if (printWindow) {
      printWindow.onload = () => {
        printWindow.print();
      };
    } else {
      // Fallback: download as HTML
      const a = document.createElement('a');
      a.href = url;
      a.download = `Invoice_${transactionId}.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast({
        title: 'Invoice Downloaded',
        description: 'Open the file and use Print → Save as PDF'
      });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header role="student" />
      
      <div className="container px-6 py-12">
        <div className="max-w-2xl mx-auto text-center">
          <div className="mb-8">
            <div className="inline-flex p-4 rounded-full bg-green-100 mb-4">
              <CheckCircle className="h-16 w-16 text-green-600" />
            </div>
            <h1 className="text-3xl font-bold mb-2">Payment Successful!</h1>
            <p className="text-muted-foreground">Your enrollment has been confirmed</p>
          </div>

          <Card className="p-8 border-border/60 mb-6">
            <div className="space-y-4">
              <div className="pb-4 border-b">
                <p className="text-sm text-muted-foreground mb-1">Your Student ID</p>
                <p className="text-3xl font-bold text-primary">{studentId}</p>
              </div>
              
              <div className="space-y-3 text-left">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Course</span>
                  <span className="font-medium">{course}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Batch</span>
                  <span className="font-medium">{batch}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Base Fee</span>
                  <span className="font-medium">₹{(fee || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">GST (18%)</span>
                  <span className="font-medium">₹{gstAmount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between pt-2 border-t">
                  <span className="font-semibold">Amount Paid</span>
                  <span className="font-bold text-primary">₹{totalAmount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Transaction ID</span>
                  <span className="font-medium font-mono text-sm">{transactionId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Payment Date</span>
                  <span className="font-medium">{paymentDate}</span>
                </div>
              </div>
            </div>
          </Card>

          <div className="bg-accent/50 rounded-2xl p-6 mb-6">
            <h3 className="font-semibold mb-2">What's Next?</h3>
            <p className="text-sm text-muted-foreground mb-4">
              You will receive a confirmation email with your course details and login credentials shortly.
              You can now access your student portal to book slots and view course materials.
            </p>
          </div>

          <div className="flex gap-3 justify-center">
            <Button asChild size="lg">
              <Link to="/student">
                <Home className="h-5 w-5" />
                Go to Dashboard
              </Link>
            </Button>
            <Button variant="outline" size="lg" onClick={generatePDFInvoice}>
              <Download className="h-5 w-5" />
              Download Invoice
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentSuccess;