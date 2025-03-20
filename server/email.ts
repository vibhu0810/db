import { MailService } from '@sendgrid/mail';
import { Order } from '@shared/schema';

const mailService = new MailService();

// Configure SendGrid if API key is available
if (process.env.SENDGRID_API_KEY) {
  mailService.setApiKey(process.env.SENDGRID_API_KEY);
}

const ADMIN_EMAIL = "info@digitalgratified.com";

// Helper function to check if email service is configured
function isEmailConfigured(): boolean {
  return !!process.env.SENDGRID_API_KEY;
}

export async function sendOrderNotificationEmail(order: Order, user: any) {
  if (!isEmailConfigured()) {
    console.warn('SendGrid API key not configured, skipping email notification');
    return;
  }

  const isNicheEdit = !order.title; // If no title, it's a niche edit

  let emailContent = '';
  if (isNicheEdit) {
    emailContent = `
From: ${order.sourceUrl}
To: ${order.targetUrl}
On: ${order.anchorText}
Edits: ${order.textEdit || 'No edits provided'}

Price: $${order.price}
`;
  } else {
    emailContent = `
Guest Post: ${order.title}

To: ${order.targetUrl}
On: ${order.anchorText}

${order.textEdit || 'No article provided'}

Price: $${order.price}
`;
  }

  try {
    await mailService.send({
      to: ADMIN_EMAIL,
      from: ADMIN_EMAIL,
      subject: `New Order #${order.id} from ${user.companyName || user.username}`,
      text: emailContent,
      trackingSettings: {
        clickTracking: {
          enable: false
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
  sender: { username: string; companyName?: string; },
  recipient: { email: string; username: string; }
) {
  if (!isEmailConfigured()) {
    console.warn('SendGrid API key not configured, skipping email notification');
    return;
  }

  try {
    await mailService.send({
      to: recipient.email,
      from: ADMIN_EMAIL,
      subject: `New Comment on Order #${orderDetails.id}`,
      text: `
${sender.companyName || sender.username} has commented on Order #${orderDetails.id}:

"${commentDetails.message}"

You can view and reply to this comment in your dashboard.
`,
      trackingSettings: {
        clickTracking: {
          enable: false
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
  user: { email: string; username: string; }
) {
  if (!isEmailConfigured()) {
    console.warn('SendGrid API key not configured, skipping email notification');
    return;
  }

  try {
    await mailService.send({
      to: user.email,
      from: ADMIN_EMAIL,
      subject: `Order #${orderDetails.id} Status Updated`,
      text: `
Your order #${orderDetails.id} has been updated to status: ${orderDetails.status}

You can view the details in your dashboard.
`,
      trackingSettings: {
        clickTracking: {
          enable: false
        }
      }
    });
  } catch (error) {
    console.error('Error sending status update email:', error);
    // Don't throw error to prevent app disruption
  }
}