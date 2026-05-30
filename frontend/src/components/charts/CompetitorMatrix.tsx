'use client'

import { clsx } from 'clsx'

interface CompetitorMatrixProps {
  data: any[]
}

export function CompetitorMatrix({ data }: CompetitorMatrixProps) {
  if (!data.length) {
    return (
      <div className="h-64 flex items-center justify-center text-xs text-ink-tertiary font-mono">
        No competitor data available — scraper will run in next cycle
      </div>
    )
  }

  // Group by competitor, then list rows
  const competitors = [...new Set(data.map(d => d.competitor_name))]

  // Get unique product rows (deduplicated by product_id + competitor)
  const rows = data.slice(0, 40)

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[11px] font-mono">
        <thead>
          <tr className="border-b border-[#1E2D40]">
            <th className="text-left py-2 pr-4 text-ink-tertiary font-medium">PRODUCT</th>
            <th className="text-left py-2 px-3 text-ink-tertiary font-medium">COMPETITOR</th>
            <th className="text-right py-2 px-3 text-ink-tertiary font-medium">OUR PRICE</th>
            <th className="text-right py-2 px-3 text-ink-tertiary font-medium">THEIR PRICE</th>
            <th className="text-right py-2 px-3 text-ink-tertiary font-medium">DELTA</th>
            <th className="text-center py-2 pl-3 text-ink-tertiary font-medium">STOCK</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => {
            const delta = row.price_delta || 0
            const deltaPositive = delta > 0
            return (
              <tr
                key={idx}
                className="border-b border-[#0F1826] hover:bg-carbon-700 transition-colors"
              >
                <td className="py-2.5 pr-4 text-ink-secondary max-w-[160px] truncate">
                  {row.product_id?.slice(-6) || '—'}
                </td>
                <td className="py-2.5 px-3">
                  <span className="capitalize text-ink-primary">{row.competitor_name}</span>
                </td>
                <td className="py-2.5 px-3 text-right text-ink-secondary">
                  ₹{row.our_price?.toLocaleString('en-IN')}
                </td>
                <td className="py-2.5 px-3 text-right text-ink-secondary">
                  ₹{row.competitor_price?.toLocaleString('en-IN')}
                </td>
                <td className={clsx(
                  'py-2.5 px-3 text-right font-semibold',
                  deltaPositive ? 'text-acid' : 'text-crimson-signal'
                )}>
                  {deltaPositive ? '+' : ''}{row.price_delta_pct?.toFixed(1)}%
                </td>
                <td className="py-2.5 pl-3 text-center">
                  <span className={clsx(
                    'inline-block w-2 h-2 rounded-full',
                    row.in_stock ? 'bg-acid' : 'bg-crimson-signal'
                  )} title={row.in_stock ? 'In stock' : 'Out of stock'} />
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
