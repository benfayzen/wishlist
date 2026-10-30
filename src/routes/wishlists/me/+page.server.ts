import { redirect } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";
import { requireLogin } from "$lib/server/auth";

export const load: PageServerLoad = async () => {
    const user = requireLogin();
    redirect(302, `/lists?users=${user.id}`);
};
