import { invalidate } from "$app/navigation";

export class ClaimAPI {
    private claimId: string;
    constructor(claimId: string) {
        this.claimId = claimId;
    }

    _makeRequest = async (method: string, data?: Record<string, any>) => {
        const options: RequestInit = {
            method,
            headers: {
                "content-type": "application/json",
                accept: "application/json"
            }
        };

        if (data) {
            options.body = JSON.stringify(data);
        }

        const url = `/api/claims/${this.claimId}`;
        const response = await fetch(url, options);
        if (response.ok) await invalidate("data:claims");
        return response;
    };

    purchase = async () => {
        return await this._makeRequest("PATCH", { purchased: true });
    };

    unpurchase = async () => {
        return await this._makeRequest("PATCH", { purchased: false });
    };

    updateQuantity = async (quantity: number) => {
        return await this._makeRequest("PATCH", { quantity });
    };

    unclaim = async () => {
        return await this._makeRequest("DELETE");
    };
}
