'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import postgres from 'postgres';
import { z } from 'zod';
import { signIn } from '@/auth';
import { AuthError } from 'next-auth';

const FormSchema = z.object({
    id: z.string(),
    customerId: z.string({
        invalid_type_error: "Please select a customer"
    }),
    amount: z.number().gt(0, { message: "Please enter amount greater than 0$" }),
    status: z.enum(['pending', 'paid'], {
        invalid_type_error: "Please select the invoice status"
    }),
    date: z.string(),
});

const sql = postgres(process.env.POSTGRES_URL!, { ssl: 'require' });

export type State = {
    errors?: {
        customerId?: string[];
        amount?: string[];
        status?: string[];
    };
    message?: string | null;
};


const CreateInvoice = FormSchema.omit({ id: true, date: true });

// Creating a new record in the invoices table
export async function createInvoice(prevState: State, formData: FormData) {
    // Validate form using Zod
    const validatedFields = CreateInvoice.safeParse({
        customerId: formData.get('customerId'),
        amount: formData.get('amount'),
        status: formData.get('status'),
    });

    // If form validation fails, return errors early. Otherwise, continue.
    if (!validatedFields.success) {
        return {
            errors: validatedFields.error.flatten().fieldErrors,
            message: 'Missing Fields. Failed to Create Invoice.',
        };
    }
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
            message: 'Database Error: Failed to Create Invoice.',
        };
    }
    revalidatePath('/dashboard/invoices');
    redirect('/dashboard/invoices');
}


// update a record in the invoice table
export async function updateInvoice(
    id: string,
    prevState: State,
    formData: FormData,
) {
    const validated = CreateInvoice.safeParse({
        customerId: formData.get('customerId'),
        amount: Number(formData.get('amount')),
        status: formData.get('status'),
    });

    if (!validated.success) {
        return {
            errors: validated.error.flatten().fieldErrors,
            message: 'Missing Fields. Failed to Update Invoice.',
        };
    }

    try {
        const { customerId, amount, status } = CreateInvoice.parse({
            customerId: formData.get('customerId'),
            amount: Number(formData.get('amount')),
            status: formData.get('status'),
        });

        const amountInCents = Math.round(amount * 100);

        await sql`
        UPDATE invoices SET customer_id = ${customerId}, amount=${amountInCents}, status=${status}
        WHERE id = ${id}
        `;
    }
    catch (error) {
        console.error('Error: ', error);
        return {
            message: 'Database Error: Failed to Update Invoice.',
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
        throw error;
    }
    revalidatePath('dashboard/invoices');
}

export async function authenticate(
    prevState: string | undefined,
    formData: FormData,
) {
    console.log("logging")
    try {
        await signIn('credentials', formData);
    } catch (error) {
        if (error instanceof AuthError) {
            switch (error.type) {
                case 'CredentialsSignin':
                    return 'Invalid credentials.';
                default:
                    return 'Something went wrong.';
            }
        }
        throw error;
    }
}
