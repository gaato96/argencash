export interface DolarType {
    moneda: string;
    casa: string;
    nombre: string;
    compra: number;
    venta: number;
    fechaActualizacion: string;
}

export async function fetchDolarBlue(): Promise<{ compra: number; venta: number; fechaActualizacion?: string }> {
    try {
        const response = await fetch('https://dolarapi.com/v1/dolares/blue', {
            next: { revalidate: 300 }, // Cache for 5 minutes
        });

        if (!response.ok) throw new Error('Failed to fetch dolar blue');

        const data = await response.json();
        return {
            compra: data.compra,
            venta: data.venta,
            fechaActualizacion: data.fechaActualizacion
        };
    } catch (error) {
        console.error('Error fetching dolar blue:', error);
        // Fallback default
        return { compra: 0, venta: 0 };
    }
}

export async function fetchAllDolares(): Promise<DolarType[]> {
    try {
        const response = await fetch('https://dolarapi.com/v1/dolares', {
            next: { revalidate: 300 },
        });

        if (!response.ok) throw new Error('Failed to fetch dolares');

        return await response.json();
    } catch (error) {
        console.error('Error fetching all dolares:', error);
        return [];
    }
}

export async function fetchDolarByType(type: string): Promise<{ compra: number; venta: number }> {
    try {
        const response = await fetch(`https://dolarapi.com/v1/dolares/${type}`, {
            next: { revalidate: 300 },
        });

        if (!response.ok) throw new Error(`Failed to fetch dolar ${type}`);

        const data = await response.json();
        return {
            compra: data.compra,
            venta: data.venta
        };
    } catch (error) {
        console.error(`Error fetching dolar ${type}:`, error);
        return { compra: 0, venta: 0 };
    }
}

export function formatUpdateTime(dateStr: string): string {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat('es-AR', {
        hour: '2-digit',
        minute: '2-digit',
        day: '2-digit',
        month: '2-digit'
    }).format(date);
}
