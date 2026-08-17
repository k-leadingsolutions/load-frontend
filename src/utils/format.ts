const zarFormatter = new Intl.NumberFormat('en-ZA', {
  style: 'currency',
  currency: 'ZAR',
  minimumFractionDigits: 2,
})

export const formatCurrency = (amount: number) =>
  zarFormatter.format(amount).replace('ZAR', 'R')

export const formatPoints = (points: number) => `${points.toLocaleString('en-ZA')} pts`
