import { MailService } from '@sendgrid/mail';
import { Order, Message } from '@shared/schema';

const mailService = new MailService();

// Configure SendGrid if API key is available
if (process.env.SENDGRID_API_KEY) {
  mailService.setApiKey(process.env.SENDGRID_API_KEY);
}

const ADMIN_EMAIL = "info@digitalgratified.com";
const FROM_EMAIL = ADMIN_EMAIL;
const APP_NAME = "SaaSxLinks";
const APP_URL = process.env.APP_URL || "https://saasxlinks.com";

// Helper function to check if email service is configured
function isEmailConfigured(): boolean {
  return !!process.env.SENDGRID_API_KEY;
}

// Generate HTML template for all emails
function generateEmailTemplate(title: string, content: string, buttonText: string, buttonUrl: string, companyLogo?: string | null) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${title}</title>
  <style>
    body {
      font-family: 'Arial', sans-serif;
      line-height: 1.6;
      color: #333;
      margin: 0;
      padding: 0;
      background-color: #f9f9f9;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      background-color: #ffffff;
      border-radius: 8px;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
    }
    .header {
      background-color: #111827;
      padding: 20px;
      text-align: center;
      border-radius: 8px 8px 0 0;
    }
    .header img {
      max-height: 60px;
      max-width: 250px;
      margin-bottom: 10px;
    }
    .header h1 {
      color: #ffffff;
      margin: 0;
      font-size: 24px;
    }
    .product-name {
      color: #3182ce;
      margin: 5px 0 0;
      font-size: 16px;
      font-weight: 500;
    }
    .content {
      padding: 20px;
      background-color: #ffffff;
    }
    .content-box {
      background-color: #f2f2f2;
      border-radius: 4px;
      padding: 15px;
      margin: 15px 0;
    }
    .footer {
      text-align: center;
      padding: 20px;
      font-size: 14px;
      color: #777;
    }
    .button {
      display: inline-block;
      background-color: #111827;
      color: #ffffff !important;
      padding: 12px 24px;
      text-decoration: none;
      border-radius: 4px;
      font-weight: bold;
      margin: 20px 0;
      text-align: center;
    }
    .divider {
      height: 1px;
      background-color: #eaeaea;
      margin: 20px 0;
    }
    .info-row {
      margin: 10px 0;
    }
    .info-row strong {
      color: #555;
      min-width: 120px;
      display: inline-block;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      ${companyLogo ? `<img src="${companyLogo}" alt="Company Logo" />` : ''}
      <h1>Digital Gratified</h1>
      <p class="product-name">SaaSxLinks.ai</p>
    </div>
    <div class="content">
      <h2>${title}</h2>
      ${content}
      <div style="text-align: center;">
        <a href="${buttonUrl}" class="button">${buttonText}</a>
      </div>
    </div>
    <div class="footer">
      <p>© ${new Date().getFullYear()} Digital Gratified | SaaSxLinks.ai. All rights reserved.</p>
      <p>This email was sent automatically, please do not reply directly to this message.</p>
    </div>
  </div>
</body>
</html>
  `;
}

export async function sendOrderNotificationEmail(order: Order, user: any) {
  if (!isEmailConfigured()) {
    console.warn('SendGrid API key not configured, skipping email notification');
    return;
  }

  const orderURL = `${APP_URL}/orders/${order.id}`;
  const isNicheEdit = !order.title; // If no title, it's a niche edit

  // Format order details for admin email
  let adminEmailContent = '';
  if (isNicheEdit) {
    adminEmailContent = `
      <p>A new niche edit order has been placed by <strong>${user.companyName || user.username}</strong>.</p>
      
      <div class="content-box">
        <div class="info-row"><strong>From:</strong> ${order.sourceUrl}</div>
        <div class="info-row"><strong>To:</strong> ${order.targetUrl}</div>
        <div class="info-row"><strong>On:</strong> ${order.anchorText}</div>
        ${order.textEdit ? `<div class="info-row"><strong>Edits:</strong> ${order.textEdit}</div>` : ''}
        ${order.notes ? `<div class="info-row"><strong>Note:</strong> ${order.notes}</div>` : ''}
        <div class="info-row"><strong>Price:</strong> $${order.price}</div>
      </div>
    `;
  } else {
    adminEmailContent = `
      <p>A new guest post order has been placed by <strong>${user.companyName || user.username}</strong>.</p>
      
      <div class="content-box">
        <div class="info-row"><strong>Title:</strong> ${order.title}</div>
        <div class="info-row"><strong>To:</strong> ${order.targetUrl}</div>
        <div class="info-row"><strong>On:</strong> ${order.anchorText}</div>
        ${order.linkUrl ? `<div class="info-row"><strong>Content:</strong> ${order.linkUrl}</div>` : ''}
        <div class="info-row"><strong>Content Writing:</strong> ${order.linkUrl ? 'No' : 'Yes'}</div>
        ${order.notes ? `<div class="info-row"><strong>Note:</strong> ${order.notes}</div>` : ''}
        <div class="info-row"><strong>Price:</strong> $${order.price}</div>
      </div>
    `;
  }

  // Format confirmation email for user
  const userEmailContent = `
    <p>Thank you for your order! We've received your request and are working on it.</p>
    
    <div class="content-box">
      <div class="info-row"><strong>Order Number:</strong> #${order.id}</div>
      <div class="info-row"><strong>Order Type:</strong> ${isNicheEdit ? 'Niche Edit' : 'Guest Post'}</div>
      <div class="info-row"><strong>Target URL:</strong> ${order.targetUrl}</div>
      <div class="info-row"><strong>Price:</strong> $${order.price}</div>
      <div class="info-row"><strong>Status:</strong> ${order.status}</div>
    </div>
    
    <p>You can track the progress of your order using the button below.</p>
  `;

  try {
    // Send notification to admin
    await mailService.send({
      to: ADMIN_EMAIL,
      from: ADMIN_EMAIL,
      subject: `New Order #${order.id} from ${user.companyName || user.username}`,
      html: generateEmailTemplate(
        `New ${isNicheEdit ? 'Niche Edit' : 'Guest Post'} Order #${order.id}`,
        adminEmailContent,
        'View Order Details',
        orderURL,
        user.companyLogo
      ),
      trackingSettings: {
        clickTracking: {
          enable: true
        }
      }
    });

    // Send confirmation to user
    await mailService.send({
      to: user.email,
      from: ADMIN_EMAIL,
      subject: `Order Confirmation - #${order.id}`,
      html: generateEmailTemplate(
        'Order Confirmation',
        userEmailContent,
        'Track Your Order',
        orderURL,
        user.companyLogo
      ),
      trackingSettings: {
        clickTracking: {
          enable: true
        }
      }
    });
  } catch (error) {
    console.error('Error sending order notification email:', error);
    // Don't throw error to prevent app disruption
  }
}

export async function sendCommentNotificationEmail(
  orderDetails: { id: number; },
  commentDetails: { message: string; },
  sender: { username: string; companyName?: string; companyLogo?: string | null; },
  recipient: { email: string; username: string; }
) {
  if (!isEmailConfigured()) {
    console.warn('SendGrid API key not configured, skipping email notification');
    return;
  }

  const orderURL = `${APP_URL}/orders/${orderDetails.id}`;
  const senderName = sender.companyName || sender.username;

  const emailContent = `
    <p><strong>${senderName}</strong> has left a new comment on Order #${orderDetails.id}:</p>
    
    <div class="content-box">
      "${commentDetails.message}"
    </div>
    
    <p>Click the button below to view and reply to this comment.</p>
  `;

  try {
    await mailService.send({
      to: recipient.email,
      from: ADMIN_EMAIL,
      subject: `New Comment on Order #${orderDetails.id}`,
      html: generateEmailTemplate(
        'New Comment Notification',
        emailContent,
        'View & Reply',
        orderURL,
        sender.companyLogo
      ),
      trackingSettings: {
        clickTracking: {
          enable: true
        }
      }
    });
  } catch (error) {
    console.error('Error sending comment notification email:', error);
    // Don't throw error to prevent app disruption
  }
}

export async function sendStatusUpdateEmail(
  orderDetails: { id: number; status: string; },
  user: { email: string; username: string; companyLogo?: string | null; }
) {
  if (!isEmailConfigured()) {
    console.warn('SendGrid API key not configured, skipping email notification');
    return;
  }

  const orderURL = `${APP_URL}/orders/${orderDetails.id}`;

  const emailContent = `
    <p>The status of your Order #${orderDetails.id} has been updated.</p>
    
    <div class="content-box">
      <div class="info-row"><strong>New Status:</strong> <span style="color: #0d6efd; font-weight: bold;">${orderDetails.status}</span></div>
    </div>
    
    <p>Click the button below to view your order details and track progress.</p>
  `;

  try {
    await mailService.send({
      to: user.email,
      from: ADMIN_EMAIL,
      subject: `Status Update for Order #${orderDetails.id}`,
      html: generateEmailTemplate(
        'Order Status Update',
        emailContent,
        'View Order Details',
        orderURL,
        user.companyLogo
      ),
      trackingSettings: {
        clickTracking: {
          enable: true
        }
      }
    });
  } catch (error) {
    console.error('Error sending status update email:', error);
    // Don't throw error to prevent app disruption
  }
}

export async function sendTicketResponseEmail(
  ticket: { id: number; title: string; orderId?: number | null; },
  user: { email: string; username: string; companyName?: string | null; },
  adminName: string = "Support Team"
) {
  if (!isEmailConfigured()) {
    console.warn('SendGrid API key not configured, skipping email notification');
    return;
  }

  const ticketURL = `${APP_URL}/chat/ticket/${ticket.id}`;
  
  let title = `Support Ticket #${ticket.id} Update`;
  if (ticket.orderId) {
    title += ` for Order #${ticket.orderId}`;
  }
  
  const emailContent = `
    <p>You have got a response on your support ticket for Order #${ticket.orderId}: <strong>${ticket.title || `Ticket #${ticket.id}`}</strong>.</p>
    
    <p>Please click the button below to view the response and continue the conversation.</p>
  `;

  try {
    await mailService.send({
      to: user.email,
      from: {
        email: FROM_EMAIL,
        name: APP_NAME + ' Support'
      },
      subject: title,
      html: generateEmailTemplate(
        title,
        emailContent,
        'View Response',
        ticketURL,
        null // Using default logo here
      )
    });
    
    console.log(`Sent ticket response email to ${user.email} for ticket #${ticket.id}`);
  } catch (error) {
    console.error('Error sending ticket response email:', error);
    // Don't throw error to prevent app disruption
  }
}

export async function sendChatNotificationEmail(
  message: Message, 
  sender: { username: string; companyName?: string; companyLogo?: string | null; }, 
  recipient: { email: string; username: string; id: number; companyLogo?: string | null; }
) {
  if (!isEmailConfigured()) {
    console.warn('SendGrid API key not configured, skipping email notification');
    return;
  }

  const chatURL = `${APP_URL}/chat`;
  const senderName = sender.companyName || sender.username;

  const emailContent = `
    <p>You have received a new message from <strong>${senderName}</strong>:</p>
    
    <div class="content-box">
      "${message.content}"
    </div>
    
    <p>Click the button below to view and reply to this message.</p>
  `;

  try {
    await mailService.send({
      to: recipient.email,
      from: ADMIN_EMAIL,
      subject: `New Message from ${senderName}`,
      html: generateEmailTemplate(
        'New Message Notification',
        emailContent,
        'View & Reply',
        chatURL,
        // Use recipient's logo for their email, so they see their own branding
        recipient.companyLogo
      ),
      trackingSettings: {
        clickTracking: {
          enable: true
        }
      }
    });
  } catch (error) {
    console.error('Error sending chat notification email:', error);
    // Don't throw error to prevent app disruption
  }
}

/**
 * Send an email verification link to the user
 */
export async function sendVerificationEmail(
  recipientEmail: string,
  verificationLink: string,
  userName: string
) {
  if (!isEmailConfigured()) {
    console.warn('SendGrid API key not configured, skipping verification email');
    return;
  }
  
  try {
    const emailContent = `
      <p>Hello ${userName},</p>
      <p>Thank you for using ${APP_NAME}. Please verify your email address by clicking the button below:</p>
      <p>This link will expire in 24 hours.</p>
      <p>If you did not request this verification, please ignore this email.</p>
    `;
    
    const html = generateEmailTemplate(
      'Verify Your Email Address',
      emailContent,
      'Verify Email Address',
      verificationLink,
      null
    );
    
    const msg = {
      to: recipientEmail,
      from: {
        email: FROM_EMAIL,
        name: APP_NAME + ' Support'
      },
      subject: 'Verify Your Email Address',
      html: html,
      trackingSettings: {
        clickTracking: {
          enable: true
        }
      }
    };
    
    await mailService.send(msg);
    console.log(`Verification email sent to ${recipientEmail}`);
  } catch (error) {
    console.error('Error sending verification email:', error);
    // Don't throw the error to prevent the application from crashing
  }
}