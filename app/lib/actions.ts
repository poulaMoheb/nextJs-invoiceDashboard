'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import postgres from 'postgres';
import { z } from 'zod';

const FormSchema = z.object({
    id: z.string(),
    customerId: z.string(),
    amount: z.number(),
    status: z.enum(['pending', 'paid']),
    date: z.string(),
});

const sql = postgres(process.env.POSTGRES_URL!, { ssl: 'require' });

const CreateInvoice = FormSchema.omit({ id: true, date: true });

// Creating a new record in the invoices table
export async function createInvoice(formData: FormData) {
    try {

        const { customerId, amount, status } = CreateInvoice.parse({
            customerId: formData.get('customerId'),
            amount: Number(formData.get('amount')),
            status: formData.get('status'),
        });

        const amountInCents = Math.round(amount * 100);
        const date = new Date().toISOString().split('T')[0];

        await sql`INSERT INTO invoices (customer_id, amount, status, date)
        VALUES (${customerId}, ${amountInCents}, ${status}, ${date})`;

    }
    catch (error) {
        console.error('Error: ', error);
        return {
            message: 'Database Error: Failed to Create Invoice.'
        };

    }
    revalidatePath('/dashboard/invoices');
    redirect('/dashboard/invoices');
}


// update a record in the invoice table
export async function updateInvoice(id: string, formData: FormData) {
    const { customerId, amount, status } = CreateInvoice.parse({
        customerId: formData.get('customerId'),
        amount: Number(formData.get('amount')),
        status: formData.get('status'),
    });
    try {
        const amountInCents = Math.round(amount * 100);

        await sql`
        UPDAte invoices SET customer_id = ${customerId}, amount=${amountInCents}, status=${status}
        WHERE id = ${id} 
        `
    }
    catch (error) {
        console.error('Error: ', error);
        return {
            message: 'Database Error: Failed to Create Invoice.'
        };

    }
    revalidatePath('/dashboard/invoices');
    redirect('/dashboard/invoices');
}

// Delete a record in invoice table 
export async function deleteInvoice(id: string) {
    try {
        await sql`DELETE FROM invoices WHERE id = ${id}`;
    }
    catch (error) {
        console.error('Error: ', error);
        return {
            message: 'Database Error: Failed to Create Invoice.'
        };
    }
    revalidatePath('dashboard/invoices');
}
