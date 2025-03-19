import { MailService } from '@sendgrid/mail';
import { Order } from '@shared/schema';

if (!process.env.SENDGRID_API_KEY) {
  throw new Error("SENDGRID_API_KEY environment variable must be set");
}

const mailService = new MailService();
mailService.setApiKey(process.env.SENDGRID_API_KEY);

const ADMIN_EMAIL = "info@digitalgratified.com";

export async function sendOrderNotificationEmail(order: Order, user: any) {
  const isNicheEdit = !order.domain; // If no domain, it's a niche edit
  
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
${order.domain}

To: ${order.targetUrl}
On: ${order.anchorText}

${order.textEdit || 'No article provided'}

Price: $${order.price}
`;
  }

  try {
    await mailService.send({
      to: ADMIN_EMAIL,
      from: ADMIN_EMAIL, // Must be verified sender
      subject: `New Order #${order.id} from ${user.companyName || user.username}`,
      text: emailContent,
    });
  } catch (error) {
    console.error('Error sending order notification email:', error);
    throw error;
  }
}

export async function sendCommentNotificationEmail(
  orderDetails: { id: number; },
  commentDetails: { message: string; },
  sender: { username: string; companyName?: string; },
  recipient: { email: string; username: string; }
) {
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
    });
  } catch (error) {
    console.error('Error sending comment notification email:', error);
    throw error;
  }
}

export async function sendStatusUpdateEmail(
  orderDetails: { id: number; status: string; },
  user: { email: string; username: string; }
) {
  try {
    await mailService.send({
      to: user.email,
      from: ADMIN_EMAIL,
      subject: `Order #${orderDetails.id} Status Updated`,
      text: `
Your order #${orderDetails.id} has been updated to status: ${orderDetails.status}

You can view the details in your dashboard.
`,
    });
  } catch (error) {
    console.error('Error sending status update email:', error);
    throw error;
  }
}
