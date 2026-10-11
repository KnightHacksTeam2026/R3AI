class Item {
    /*
    The item class is used to identify item and establish where it's located,
    its volume and dimensions, and how heavy it is. These metrics are important since
    the robot will have to determine the best route to get to each item item and
    will have a set volume and weight capacity
    */

    constructor(x_dim, y_dim, z_dim, x_loc, y_loc, weight) {
        // Dimension tracking
        this.x_dim = x_dim;
        this.y_dim = y_dim;
        this.z_dim = z_dim;

        // Location tracking
        this.x_loc = x_loc;
        this.y_loc = y_loc;

        // Weight tracking
        this.weight = weight;
    }

    toString() {
        return `Item(item dimensions=(${this.x_dim} m, ${this.y_dim} m, ${this.z_dim} m), item location=(${this.x_loc} m, ${this.y_loc} m), item weight=${this.weight} kg)`;
    }

    orientations() {
        /* Return all rotations of an item. */
        return Array.from(new Set([
            `${this.x_dim},${this.y_dim},${this.z_dim}`,
            `${this.y_dim},${this.z_dim},${this.x_dim}`,
            `${this.z_dim},${this.x_dim},${this.y_dim}`,
            `${this.y_dim},${this.x_dim},${this.z_dim}`,
            `${this.x_dim},${this.z_dim},${this.y_dim}`,
            `${this.z_dim},${this.y_dim},${this.x_dim}`,
        ])).map((value) => value.split(",").map(Number));
    }
}

module.exports = Item;
