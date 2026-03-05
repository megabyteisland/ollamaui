import { json } from '@sveltejs/kit';

export async function GET() {
	try {
		const res = await fetch('http://localhost:11434/api/tags');
		const data = await res.json();
		return json(data.models ?? []);
	} catch {
		return json([]);
	}
}
