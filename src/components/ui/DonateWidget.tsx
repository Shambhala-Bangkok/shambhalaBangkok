import { siteConfig } from '@/lib/config';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import type { DonationMethod } from '@/lib/types';

interface DonateWidgetProps {
  compact?: boolean;
  className?: string;
}

export function DonateWidget({ compact, className }: DonateWidgetProps) {
  const methods = siteConfig.donationMethods;

  if (compact) {
    return (
      <div className={cn('bg-brand-yellow/5 rounded-xl p-6 text-center', className)}>
        <h3 className="font-semibold text-lg mb-2">Support Our Community</h3>
        <p className="text-sm text-text-secondary mb-4">
          Your donation helps us maintain our meditation space and offer free instruction.
        </p>
        <Link
          href="/donate"
          className="inline-flex items-center px-6 py-2.5 bg-brand-yellow text-white font-medium rounded-lg hover:bg-brand-yellow-dark transition-colors"
        >
          Donate Now
        </Link>
      </div>
    );
  }

  const bankMethod = methods.find((method) => method.id === 'bangkok-bank');
  const wiseMethod = methods.find((method) => method.id === 'wise');

  return (
    <div className={cn('space-y-6 flex flex-col items-center justify-center', className)}>
      <div className="text-center max-w-xl mx-auto">
        <h2 className="text-2xl md:text-3xl font-bold mb-3">Support Bangkok Shambhala</h2>
        <p className="text-text-secondary leading-relaxed">
          All donations go directly toward maintaining our meditation space, offering free
          instruction, and keeping the community accessible to everyone. Every contribution matters.
        </p>
      </div>

      <div className="flex flex-row justify-center w-md items-center">
        {bankMethod && wiseMethod ? (
          <DonationMethodGroupCard bankMethod={bankMethod} wiseMethod={wiseMethod} />
        ) : null}
      </div>
    </div>
  );
}

function DonationMethodGroupCard({
  bankMethod,
  wiseMethod,
}: {
  bankMethod: DonationMethod;
  wiseMethod: DonationMethod;
}) {
  return (
    <div className="border border-black/[0.06] rounded-xl p-6 text-center bg-white">
      <h3 className="font-semibold mb-2">Bangkok Bank / Wise</h3>
      <p className="text-sm text-text-secondary mb-4">
        Use the local Bangkok Bank account for domestic transfers, or choose Wise for international
        donations.
      </p>

      <div className="mb-6">
        <p className="text-sm text-text-secondary mb-2">
          Choose local transfer via Bangkok Bank or international transfer via Wise.
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
        <Link
          href={bankMethod.url ?? '/donate/bank'}
          className="inline-flex justify-center px-4 py-2 bg-brand-blue text-white font-medium rounded-lg hover:bg-brand-blue-dark transition-colors text-sm"
        >
          View bank details
        </Link>
        <a
          href={wiseMethod.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex justify-center px-4 py-2 bg-brand-blue/10 text-brand-blue font-medium rounded-lg hover:bg-brand-blue/20 transition-colors text-sm"
        >
          Donate via Wise
        </a>
      </div>
    </div>
  );
}