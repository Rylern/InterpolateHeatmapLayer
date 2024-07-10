const EARTH_CIRCUMFERENCE = 2 * Math.PI * 6371008.8;


export class MercatorCoordinate {
    constructor(latitude, longitude) {
        this.latitude = latitude;
        this.x = (180 + longitude) / 360;
        this.y = (180 - (180 / Math.PI * Math.log(Math.tan(Math.PI / 4 + latitude * Math.PI / 360)))) / 360;
    }

    /**
     * Returns the distance of 1 meter in MercatorCoordinate units at this latitude
     */
    meterInMercatorCoordinateUnits() {
        return 1 / EARTH_CIRCUMFERENCE * 1 / Math.cos(this.latitude * Math.PI / 180);
    }
}