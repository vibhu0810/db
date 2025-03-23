import React from 'react';
import { ExternalLink } from 'lucide-react';

interface PaymentDetailsProps {
  paymentMethod: string; // 'wire' or 'paypal'
}

export function PaymentDetails({ paymentMethod }: PaymentDetailsProps) {
  return (
    <>
      {paymentMethod === 'wire' ? (
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:justify-between">
            <span className="text-muted-foreground font-medium mb-1 sm:mb-0 sm:w-1/3">Account Holder:</span>
            <span className="font-medium sm:w-2/3">Digital Gratified FZ-LLC</span>
          </div>
          <div className="flex flex-col sm:flex-row sm:justify-between">
            <span className="text-muted-foreground font-medium mb-1 sm:mb-0 sm:w-1/3">IBAN (USD):</span>
            <span className="font-medium sm:w-2/3">AE220860000009112227689</span>
          </div>
          <div className="flex flex-col sm:flex-row sm:justify-between">
            <span className="text-muted-foreground font-medium mb-1 sm:mb-0 sm:w-1/3">BIC/SWIFT:</span>
            <span className="font-medium sm:w-2/3">WIOBAEADXXX</span>
          </div>
          <div className="flex flex-col sm:flex-row sm:justify-between">
            <span className="text-muted-foreground font-medium mb-1 sm:mb-0 sm:w-1/3">Bank:</span>
            <span className="font-medium sm:w-2/3">WIO Bank</span>
          </div>
        </div>
      ) : paymentMethod === 'paypal' ? (
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:justify-between">
            <span className="text-muted-foreground font-medium mb-1 sm:mb-0 sm:w-1/3">Name:</span>
            <span className="font-medium sm:w-2/3">Digital Gratified FZ-LLC</span>
          </div>
          <div className="flex flex-col sm:flex-row sm:justify-between">
            <span className="text-muted-foreground font-medium mb-1 sm:mb-0 sm:w-1/3">Email:</span>
            <span className="font-medium sm:w-2/3">payments@digitalgratified.com</span>
          </div>
          <div className="flex flex-col sm:flex-row sm:justify-between">
            <span className="text-muted-foreground font-medium mb-1 sm:mb-0 sm:w-1/3">PayPal Link:</span>
            <a 
              href="https://paypal.me/vibhu216" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="font-medium text-primary sm:w-2/3 hover:underline flex items-center"
            >
              paypal.me/vibhu216
              <ExternalLink className="ml-1 h-3 w-3" />
            </a>
          </div>
        </div>
      ) : null}
    </>
  );
}