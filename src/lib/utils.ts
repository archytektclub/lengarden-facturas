export function formatCurrency(amount: number): string {
    return new Intl.NumberFormat('es-CL', {
        style: 'currency',
        currency: 'CLP',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(amount);
}

export function formatDate(dateString: string): string {
    if (!dateString) return '';
    const date = new Date(dateString);
    // Add timezone offset correction if needed to prevent date shifting
    const correctedDate = new Date(date.getTime() + date.getTimezoneOffset() * 60000);
    return new Intl.DateTimeFormat('es-CL', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    }).format(correctedDate);
}

export function classNames(...classes: (string | undefined | null | false)[]): string {
    return classes.filter(Boolean).join(' ');
}
