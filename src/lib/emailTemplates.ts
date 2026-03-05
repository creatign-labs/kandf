export const studentCredentialsEmail = ({
  studentName,
  studentId,
  email,
  password,
  courseName,
  loginUrl,
}: {
  studentName: string;
  studentId: string;
  email: string;
  password: string;
  courseName?: string;
  loginUrl: string;
}) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; margin: 0; padding: 0; background: #f4f4f5; }
    .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 8px; overflow: hidden; }
    .header { background: #d4a574; padding: 32px; text-align: center; color: #ffffff; }
    .header h1 { margin: 0; font-size: 24px; }
    .header p { margin: 4px 0 0; opacity: 0.9; font-size: 14px; }
    .body { padding: 32px; }
    .body h2 { color: #1a1a1a; margin-top: 0; }
    .credential-box { background: #faf5f0; border: 1px solid #e8d5c4; border-radius: 8px; padding: 20px; margin: 20px 0; }
    .credential-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e8d5c4; }
    .credential-row:last-child { border-bottom: none; }
    .credential-label { color: #71717a; font-size: 14px; }
    .credential-value { font-weight: 600; color: #1a1a1a; font-family: monospace; }
    .cta { display: inline-block; background: #d4a574; color: #ffffff; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; margin: 16px 0; }
    .footer { padding: 24px 32px; text-align: center; color: #71717a; font-size: 12px; border-top: 1px solid #e4e4e7; }
    .warning { background: #fef3c7; border: 1px solid #fde68a; border-radius: 6px; padding: 12px; margin: 16px 0; font-size: 13px; color: #92400e; }
  </style>
</head>
<body>
  <div style="padding: 24px;">
    <div class="container">
      <div class="header">
        <h1>🧁 Knead & Frost</h1>
        <p>Global Baking Academy</p>
      </div>
      <div class="body">
        <h2>Welcome, ${studentName}!</h2>
        <p>Your account has been approved and is now active. Here are your login credentials:</p>
        
        <div class="credential-box">
          <div class="credential-row">
            <span class="credential-label">Student ID</span>
            <span class="credential-value">${studentId}</span>
          </div>
          ${courseName ? `<div class="credential-row">
            <span class="credential-label">Course</span>
            <span class="credential-value">${courseName}</span>
          </div>` : ''}
          <div class="credential-row">
            <span class="credential-label">Email</span>
            <span class="credential-value">${email}</span>
          </div>
          <div class="credential-row">
            <span class="credential-label">Password</span>
            <span class="credential-value">${password}</span>
          </div>
        </div>

        <div class="warning">
          ⚠️ Please keep your credentials safe. You can change your password from your profile settings after logging in.
        </div>

        <div style="text-align: center;">
          <a href="${loginUrl}" class="cta">Login to Your Dashboard</a>
        </div>
      </div>
      <div class="footer">
        <p>This is an automated message from Knead & Frost. Please do not reply.</p>
        <p>For support, contact support@kneadandfrost.com</p>
      </div>
    </div>
  </div>
</body>
</html>
`;

export const vendorCredentialsEmail = ({
  vendorName,
  companyName,
  vendorCode,
  email,
  password,
  loginUrl,
}: {
  vendorName: string;
  companyName: string;
  vendorCode: string;
  email: string;
  password: string;
  loginUrl: string;
}) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; margin: 0; padding: 0; background: #f4f4f5; }
    .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 8px; overflow: hidden; }
    .header { background: #d4a574; padding: 32px; text-align: center; color: #ffffff; }
    .header h1 { margin: 0; font-size: 24px; }
    .header p { margin: 4px 0 0; opacity: 0.9; font-size: 14px; }
    .body { padding: 32px; }
    .body h2 { color: #1a1a1a; margin-top: 0; }
    .credential-box { background: #faf5f0; border: 1px solid #e8d5c4; border-radius: 8px; padding: 20px; margin: 20px 0; }
    .credential-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e8d5c4; }
    .credential-row:last-child { border-bottom: none; }
    .credential-label { color: #71717a; font-size: 14px; }
    .credential-value { font-weight: 600; color: #1a1a1a; font-family: monospace; }
    .cta { display: inline-block; background: #d4a574; color: #ffffff; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; margin: 16px 0; }
    .footer { padding: 24px 32px; text-align: center; color: #71717a; font-size: 12px; border-top: 1px solid #e4e4e7; }
    .warning { background: #fef3c7; border: 1px solid #fde68a; border-radius: 6px; padding: 12px; margin: 16px 0; font-size: 13px; color: #92400e; }
  </style>
</head>
<body>
  <div style="padding: 24px;">
    <div class="container">
      <div class="header">
        <h1>🧁 Knead & Frost</h1>
        <p>Global Baking Academy — Vendor Portal</p>
      </div>
      <div class="body">
        <h2>Welcome, ${vendorName}!</h2>
        <p>Your vendor account for <strong>${companyName}</strong> has been approved. Here are your login credentials:</p>
        
        <div class="credential-box">
          <div class="credential-row">
            <span class="credential-label">Vendor ID</span>
            <span class="credential-value">${vendorCode}</span>
          </div>
          <div class="credential-row">
            <span class="credential-label">Company</span>
            <span class="credential-value">${companyName}</span>
          </div>
          <div class="credential-row">
            <span class="credential-label">Email</span>
            <span class="credential-value">${email}</span>
          </div>
          <div class="credential-row">
            <span class="credential-label">Password</span>
            <span class="credential-value">${password}</span>
          </div>
        </div>

        <div class="warning">
          ⚠️ Please keep your credentials safe. You can now log in and start posting jobs.
        </div>

        <div style="text-align: center;">
          <a href="${loginUrl}" class="cta">Login to Vendor Portal</a>
        </div>
      </div>
      <div class="footer">
        <p>This is an automated message from Knead & Frost. Please do not reply.</p>
        <p>For support, contact support@kneadandfrost.com</p>
      </div>
    </div>
  </div>
</body>
</html>
`;

export const paymentReceiptEmail = ({
  studentName,
  studentId,
  courseName,
  batchName,
  baseFee,
  gstAmount,
  totalAmount,
  transactionId,
  paymentDate,
}: {
  studentName: string;
  studentId: string;
  courseName: string;
  batchName: string;
  baseFee: number;
  gstAmount: number;
  totalAmount: number;
  transactionId: string;
  paymentDate: string;
}) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; margin: 0; padding: 0; background: #f4f4f5; }
    .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 8px; overflow: hidden; }
    .header { background: #d4a574; padding: 32px; text-align: center; color: #ffffff; }
    .header h1 { margin: 0; font-size: 24px; }
    .body { padding: 32px; }
    .body h2 { color: #1a1a1a; margin-top: 0; }
    .receipt-box { background: #f9fafb; border: 1px solid #e4e4e7; border-radius: 8px; padding: 20px; margin: 20px 0; }
    .receipt-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e4e4e7; }
    .receipt-row:last-child { border-bottom: none; }
    .receipt-row.total { font-weight: 700; font-size: 16px; border-top: 2px solid #1a1a1a; margin-top: 8px; padding-top: 12px; }
    .badge { display: inline-block; background: #22c55e; color: #ffffff; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; }
    .footer { padding: 24px 32px; text-align: center; color: #71717a; font-size: 12px; border-top: 1px solid #e4e4e7; }
  </style>
</head>
<body>
  <div style="padding: 24px;">
    <div class="container">
      <div class="header">
        <h1>🧁 Knead & Frost</h1>
        <p style="opacity: 0.9; font-size: 14px;">Payment Receipt</p>
      </div>
      <div class="body">
        <div style="text-align: center; margin-bottom: 24px;">
          <span class="badge">✓ PAYMENT SUCCESSFUL</span>
        </div>
        
        <h2>Hi ${studentName},</h2>
        <p>Your payment has been received successfully. Here's your receipt:</p>

        <div class="receipt-box">
          <div class="receipt-row">
            <span>Student ID</span>
            <span style="font-weight: 600;">${studentId}</span>
          </div>
          <div class="receipt-row">
            <span>Course</span>
            <span style="font-weight: 600;">${courseName}</span>
          </div>
          <div class="receipt-row">
            <span>Batch</span>
            <span style="font-weight: 600;">${batchName}</span>
          </div>
          <div class="receipt-row">
            <span>Transaction ID</span>
            <span style="font-weight: 600; font-family: monospace;">${transactionId}</span>
          </div>
          <div class="receipt-row">
            <span>Payment Date</span>
            <span style="font-weight: 600;">${paymentDate}</span>
          </div>
          <div class="receipt-row">
            <span>Base Fee</span>
            <span>₹${baseFee.toLocaleString()}</span>
          </div>
          <div class="receipt-row">
            <span>GST (18%)</span>
            <span>₹${gstAmount.toLocaleString()}</span>
          </div>
          <div class="receipt-row total">
            <span>Total Paid</span>
            <span>₹${totalAmount.toLocaleString()}</span>
          </div>
        </div>
      </div>
      <div class="footer">
        <p>Thank you for enrolling with Knead & Frost!</p>
        <p>For queries, contact support@kneadandfrost.com</p>
      </div>
    </div>
  </div>
</body>
</html>
`;
