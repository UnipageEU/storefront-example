// The one error shape: { error: { code, message, fields? } }.

const STATUS = {
    NOT_FOUND: 404,
    VALIDATION: 422,
    UPSTREAM: 502,
};

export class ApiError extends Error {
    constructor(code, message, { status, fields } = {}) {
        super(message);
        this.code = code;
        this.fields = fields;
        this.status = status || STATUS[code] || 500;
    }

    toJSON() {
        const error = { code: this.code, message: this.message };
        if (this.fields && Object.keys(this.fields).length > 0) {
            error.fields = this.fields;
        }
        return { error };
    }
}
