import React from 'react';
import { format } from 'date-fns';

export default function SubsPaymentInfo({ child, amountPence, card, nextDate, nextLabel = 'Next Payment', onChangeDate }) {
  const hasLast = !!child.last_subs_payment_date;
  if (!hasLast && !nextDate) return null;
  const isOverdue = nextDate && new Date(nextDate) < new Date();

  return (
    <div className="grid sm:grid-cols-2 gap-4">
      {hasLast && (
        <div className="p-4 bg-gray-50 rounded-xl">
          <p className="text-xs text-gray-500 mb-1 font-medium uppercase tracking-wide">Last Payment</p>
          <p className="font-bold text-lg text-gray-900">{format(new Date(child.last_subs_payment_date), 'd MMMM yyyy')}</p>
          <div className="text-sm text-gray-600 mt-1.5 space-y-0.5">
            {amountPence != null && <p>Amount: £{(amountPence / 100).toFixed(2)}</p>}
            {card && <p className="capitalize">Card: {card.brand} ···· {card.last4}</p>}
            {child.last_subs_months_paid > 0 && (
              <p>Covers {child.last_subs_months_paid} month{child.last_subs_months_paid !== 1 ? 's' : ''}</p>
            )}
          </div>
        </div>
      )}
      {nextDate && (
        <div className={`p-4 rounded-xl ${isOverdue ? 'bg-red-50 border border-red-200' : 'bg-gray-50'}`}>
          <p className={`text-xs mb-1 font-bold uppercase tracking-wide ${isOverdue ? 'text-red-600' : 'text-gray-500'}`}>
            {isOverdue ? 'Payment overdue' : nextLabel}
          </p>
          <p className={`font-bold text-lg ${isOverdue ? 'text-red-700' : 'text-gray-900'}`}>
            {format(new Date(nextDate), 'd MMMM yyyy')}
          </p>
          {onChangeDate && (
            <button
              onClick={onChangeDate}
              className="text-xs text-[#7413dc] mt-1.5 font-medium underline hover:no-underline">
              Change payment date
            </button>
          )}
        </div>
      )}
    </div>
  );
}