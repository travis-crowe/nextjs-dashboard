"use server";

import postgres from "postgres";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const FormSchema = z.object({
	id: z.string(),
	customerId: z.string(),
	amount: z.coerce.number(),
	status: z.enum(["pending", "paid"]),
	date: z.string(),
});

const UpdateInvoice = FormSchema.omit({ id: true, date: true });

const CreateInvoice = FormSchema.omit({ id: true, date: true });

const sql = postgres(process.env.DATABASE_URL!, { ssl: "require" });

export async function createInvoice(formData: FormData) {
	const { customerId, amount, status } = CreateInvoice.parse({
		customerId: formData.get("customerId"),
		amount: formData.get("amount"),
		status: formData.get("status"),
	});
	const amountInCents = amount * 100;
	const date = new Date().toISOString().split("T")[0];

	// Testing output
	console.log("Creating invoice with data:", {
		customerId,
		amount,
		status,
		date,
	});

	try {
		await sql`
			INSERT INTO invoices (customer_id, amount, status, date)
			VALUES (${customerId}, ${amountInCents}, ${status}, ${date})
		`;
	} catch (error) {
		console.error("Error inserting invoice:", error);

		return {
			message: "Database Error: Unable to create invoice.",
		};
	}

	revalidatePath("/dashboard/invoices");

	redirect("/dashboard/invoices");
}

export async function updateInvoice(id: string, formData: FormData) {
	const { customerId, amount, status } = UpdateInvoice.parse({
		customerId: formData.get("customerId"),
		amount: formData.get("amount"),
		status: formData.get("status"),
	});

	const amountInCents = amount * 100;

	try {
		await sql`
			UPDATE invoices
			SET customer_id = ${customerId}, amount = ${amountInCents}, status = ${status}
			WHERE id = ${id}
		`;
	} catch (error) {
		console.error("Error updating invoice:", error);

		return {
			message: "Database Error: Unable to update invoice.",
		};
	}

	revalidatePath("/dashboard/invoices");

	redirect("/dashboard/invoices");
}

export async function deleteInvoice(id: string) {
	await sql`DELETE FROM invoices WHERE id = ${id}`;
	revalidatePath("/dashboard/invoices");
}
