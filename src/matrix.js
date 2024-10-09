/**
 * A class representing a 4x4 matrix of Float32 elements.
 */
export class Matrix {

    #elements;

    /**
     * Create the identity matrix.
     */
    constructor() {
        this.#elements = new Float32Array([1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1]);
    }

    /**
     * @returns {Float32Array} a one-dimensional array representing this matrix with the column-major order
     */
    getElements() {
        return this.#elements;
    }

    /**
     * Apply a translation to this matrix.
     * 
     * @param {number} x the x-component of the translation
     * @param {number} y the y-component of the translation
     * @param {number} z the z-component of the translation
     * @returns {Matrix} this matrix
     */
    translate(x, y, z) {
        this.#elements[12] += this.#elements[0] * x + this.#elements[4] * y + this.#elements[8]  * z;
        this.#elements[13] += this.#elements[1] * x + this.#elements[5] * y + this.#elements[9]  * z;
        this.#elements[14] += this.#elements[2] * x + this.#elements[6] * y + this.#elements[10] * z;
        this.#elements[15] += this.#elements[3] * x + this.#elements[7] * y + this.#elements[11] * z;
        return this;
    }

    /**
     * Apply a scale to this matrix.
     * 
     * @param {number} x the x-component of the scale
     * @param {number} y the y-component of the scale
     * @param {number} z the z-component of the scale
     * @returns {Matrix} this matrix
     */
    scale(x, y, z) {
        this.#elements[0] *= x;  this.#elements[4] *= y;  this.#elements[8]  *= z;
        this.#elements[1] *= x;  this.#elements[5] *= y;  this.#elements[9]  *= z;
        this.#elements[2] *= x;  this.#elements[6] *= y;  this.#elements[10] *= z;
        this.#elements[3] *= x;  this.#elements[7] *= y;  this.#elements[11] *= z;
        return this;
    }

    /**
     * Compute the dot product between a matrix and a vector.
     * 
     * @param {Float32Array} matrix a one-dimensional array representing a 4x4 matrix with the column-major order
     * @param {Float32Array} vector a one-dimensional array of length 4
     * @returns {number} the dot product of the provided matrix with the provided vector
     */
    static dot(matrix, vector) {
        const dotProduct = new Float32Array(4);
        for (let i=0; i<4; i++) {
            dotProduct[i] = matrix[i + 0*4] * vector[0] + matrix[i + 1*4] * vector[1] + matrix[i + 2*4] * vector[2] + matrix[i + 3*4] * vector[3];
        }
        return dotProduct;
    }

    /**
     * Compute the inverse of a matrix
     * 
     * @param {Float32Array} matrix a one-dimensional array representing a 4x4 matrix with the column-major order
     * @returns {Float32Array} a one-dimensional array representing the inverse of the provided matrix with the column-major order
     */
    static inverse(matrix) {
        const inverse = new Float32Array(16);
        inverse[0] =
            matrix[5]  * matrix[10] * matrix[15] - 
            matrix[5]  * matrix[11] * matrix[14] - 
            matrix[9]  * matrix[6]  * matrix[15] + 
            matrix[9]  * matrix[7]  * matrix[14] +
            matrix[13] * matrix[6]  * matrix[11] - 
            matrix[13] * matrix[7]  * matrix[10];

        inverse[4] =
            -matrix[4]  * matrix[10] * matrix[15] + 
            matrix[4]  * matrix[11] * matrix[14] + 
            matrix[8]  * matrix[6]  * matrix[15] - 
            matrix[8]  * matrix[7]  * matrix[14] - 
            matrix[12] * matrix[6]  * matrix[11] + 
            matrix[12] * matrix[7]  * matrix[10];

        inverse[8] =
            matrix[4]  * matrix[9] * matrix[15] - 
            matrix[4]  * matrix[11] * matrix[13] - 
            matrix[8]  * matrix[5] * matrix[15] + 
            matrix[8]  * matrix[7] * matrix[13] + 
            matrix[12] * matrix[5] * matrix[11] - 
            matrix[12] * matrix[7] * matrix[9];

        inverse[12] =
            -matrix[4]  * matrix[9] * matrix[14] + 
            matrix[4]  * matrix[10] * matrix[13] +
            matrix[8]  * matrix[5] * matrix[14] - 
            matrix[8]  * matrix[6] * matrix[13] - 
            matrix[12] * matrix[5] * matrix[10] + 
            matrix[12] * matrix[6] * matrix[9];

        inverse[1] = 
            -matrix[1]  * matrix[10] * matrix[15] + 
            matrix[1]  * matrix[11] * matrix[14] + 
            matrix[9]  * matrix[2] * matrix[15] - 
            matrix[9]  * matrix[3] * matrix[14] - 
            matrix[13] * matrix[2] * matrix[11] + 
            matrix[13] * matrix[3] * matrix[10];

        inverse[5] =
            matrix[0]  * matrix[10] * matrix[15] - 
            matrix[0]  * matrix[11] * matrix[14] - 
            matrix[8]  * matrix[2] * matrix[15] + 
            matrix[8]  * matrix[3] * matrix[14] + 
            matrix[12] * matrix[2] * matrix[11] - 
            matrix[12] * matrix[3] * matrix[10];

        inverse[9] =
            -matrix[0]  * matrix[9] * matrix[15] + 
            matrix[0]  * matrix[11] * matrix[13] + 
            matrix[8]  * matrix[1] * matrix[15] - 
            matrix[8]  * matrix[3] * matrix[13] - 
            matrix[12] * matrix[1] * matrix[11] + 
            matrix[12] * matrix[3] * matrix[9];

        inverse[13] =
            matrix[0]  * matrix[9] * matrix[14] - 
            matrix[0]  * matrix[10] * matrix[13] - 
            matrix[8]  * matrix[1] * matrix[14] + 
            matrix[8]  * matrix[2] * matrix[13] + 
            matrix[12] * matrix[1] * matrix[10] - 
            matrix[12] * matrix[2] * matrix[9];

        inverse[2] =
            matrix[1]  * matrix[6] * matrix[15] - 
            matrix[1]  * matrix[7] * matrix[14] - 
            matrix[5]  * matrix[2] * matrix[15] + 
            matrix[5]  * matrix[3] * matrix[14] + 
            matrix[13] * matrix[2] * matrix[7] - 
            matrix[13] * matrix[3] * matrix[6];

        inverse[6] =
            -matrix[0]  * matrix[6] * matrix[15] + 
            matrix[0]  * matrix[7] * matrix[14] + 
            matrix[4]  * matrix[2] * matrix[15] - 
            matrix[4]  * matrix[3] * matrix[14] - 
            matrix[12] * matrix[2] * matrix[7] + 
            matrix[12] * matrix[3] * matrix[6];

        inverse[10] =
            matrix[0]  * matrix[5] * matrix[15] - 
            matrix[0]  * matrix[7] * matrix[13] - 
            matrix[4]  * matrix[1] * matrix[15] + 
            matrix[4]  * matrix[3] * matrix[13] + 
            matrix[12] * matrix[1] * matrix[7] - 
            matrix[12] * matrix[3] * matrix[5];

        inverse[14] =
            -matrix[0]  * matrix[5] * matrix[14] + 
            matrix[0]  * matrix[6] * matrix[13] + 
            matrix[4]  * matrix[1] * matrix[14] - 
            matrix[4]  * matrix[2] * matrix[13] - 
            matrix[12] * matrix[1] * matrix[6] + 
            matrix[12] * matrix[2] * matrix[5];

        inverse[3] =
            -matrix[1] * matrix[6] * matrix[11] + 
            matrix[1] * matrix[7] * matrix[10] + 
            matrix[5] * matrix[2] * matrix[11] - 
            matrix[5] * matrix[3] * matrix[10] - 
            matrix[9] * matrix[2] * matrix[7] + 
            matrix[9] * matrix[3] * matrix[6];

        inverse[7] =
            matrix[0] * matrix[6] * matrix[11] - 
            matrix[0] * matrix[7] * matrix[10] - 
            matrix[4] * matrix[2] * matrix[11] + 
            matrix[4] * matrix[3] * matrix[10] + 
            matrix[8] * matrix[2] * matrix[7] - 
            matrix[8] * matrix[3] * matrix[6];

        inverse[11] =
            -matrix[0] * matrix[5] * matrix[11] + 
            matrix[0] * matrix[7] * matrix[9] + 
            matrix[4] * matrix[1] * matrix[11] - 
            matrix[4] * matrix[3] * matrix[9] - 
            matrix[8] * matrix[1] * matrix[7] + 
            matrix[8] * matrix[3] * matrix[5];

        inverse[15] =
            matrix[0] * matrix[5] * matrix[10] - 
            matrix[0] * matrix[6] * matrix[9] - 
            matrix[4] * matrix[1] * matrix[10] + 
            matrix[4] * matrix[2] * matrix[9] + 
            matrix[8] * matrix[1] * matrix[6] - 
            matrix[8] * matrix[2] * matrix[5];

        let det = matrix[0] * inverse[0] + matrix[1] * inverse[4] + matrix[2] * inverse[8] + matrix[3] * inverse[12];
        if (det != 0) {
            det = 1.0 / det;

            for (let i = 0; i < 16; i++) {
                inverse[i] = inverse[i] * det;
            }

            return inverse;
        }
    }
}