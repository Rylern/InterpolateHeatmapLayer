/**
 * A class to convert latitude/longitude to Web Mercator coordinates
 * (see https://en.wikipedia.org/wiki/Web_Mercator_projection).
 */
export class MercatorCoordinate {

    static #EARTH_CIRCUMFERENCE = 2 * Math.PI * 6371008.8;
    #latitude;
    #x;
    #y;

    /**
     * Create a Web Mercator coordinate from EPSG:4326 coordinates
     * 
     * @param {number} latitude the EPSG:4326 latitude of the coordinate to convert
     * @param {number} longitude the EPSG:4326 longitude of the coordinate to convert
     */
    constructor(latitude, longitude) {
        this.#latitude = latitude;
        this.#x = (180 + longitude) / 360;
        this.#y = (180 - (180 / Math.PI * Math.log(Math.tan(Math.PI / 4 + latitude * Math.PI / 360)))) / 360;
    }

    /**
     * @returns {number} the x component of this Web Mercator coordinate
     */
    getX() {
        return this.#x;
    }

    /**
     * @returns {number} the y component of this Web Mercator coordinate
     */
    getY() {
        return this.#y;
    }

    /**
     * @returns {number} the distance of 1 meter in Web Mercator coordinate units at this latitude
     */
    meterInMercatorCoordinateUnits() {
        return 1 / MercatorCoordinate.#EARTH_CIRCUMFERENCE * 1 / Math.cos(this.#latitude * Math.PI / 180);
    }
}