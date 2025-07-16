export async function apiWrapper(apiCall) {
    try {
        const restOperation = await apiCall;
        const { body, statusCode } = await restOperation.response;
        const result = typeof body.json === 'function' ? await body.json() : JSON.parse(body);
        return {
            data: result.data,
            message: result.message || 'Success',
            statusCode: statusCode,
        };
    } catch (error) {
        console.error("API call failed:", error);
        const { body, statusCode } = await error.response;
        const parsed = typeof body.json === 'function' ? await body.json() : JSON.parse(body);
        const err = new Error(parsed.error || 'Unexpected error');
        err.statusCode = statusCode;
        throw err;
    }
}