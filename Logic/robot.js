const Item = require("./item");

class Robot {
    /*
    The robot class models a 2D packing area with a fixed z-height limit.
    Items may be rotated, but only x and y space are consumed when items
    are stored. The z dimension is used only as a fit constraint.
    */

    constructor(x_dim, y_dim, z_dim, weight_capacity, life) {
        // Volume and current space information
        this.x_dim = x_dim;
        this.y_dim = y_dim;
        this.z_dim = z_dim;
        this.x_available = x_dim;
        this.y_available = y_dim;

        // Weight capacity
        this.weight_capacity = weight_capacity;
        this.available_weight = weight_capacity;

        // Current battery life
        this.life = life;
        this.current_life = life;

        // List of item the robot has
        this.contained_items = [];
    }

    toString() {
        return `Robot(available space=(${this.x_available} m, ${this.y_available} m), z limit=${this.z_dim} m, available weight=${this.available_weight} kg, battery life=${this.current_life} V)`;
    }

    reset() {
        /* Resets the bot to its original state with full capacity and no item */
        this.x_available = this.x_dim;
        this.y_available = this.y_dim;
        this.available_weight = this.weight_capacity;
        this.contained_items = [];
    }

    storeItem(item, orientation = null) {
        /* Store one item using the 2D packing model and return whether it was stored. */
        // Get the orientation of the item
        if (orientation === null) {
            return false;
        }

        const [x_dim, y_dim] = orientation;
        this.x_available -= x_dim;
        this.y_available -= y_dim;
        this.available_weight -= item.weight;
        this.contained_items.push(item);
        return true;
    }

    storeItems(item_list) {
        /* Store as many items as possible with 2D DP under a fixed z limit. */
        // The starting state represents what space is available
        const start_state = [
            this.x_available,
            this.y_available,
            this.available_weight,
        ];

        // Orientation map represents the list of possible orientations for all items
        const orientation_map = item_list.map((item) => item.orientations());
        const item_count = item_list.length;

        // Dynamic programming list that contains dictionaries of data per item
        // Initialize the dp with the start state at 0
        const dp = Array.from({ length: item_count + 1 }, () => new Map());
        const parent = Array.from({ length: item_count + 1 }, () => new Map());
        dp[0].set(Robot.stateKey(start_state), 0);

        for (let i = 1; i <= item_count; i += 1) {
            const item = item_list[i - 1];

            // Iterate through each state after adding an item to the robot
            // State: represents the state of the robot at that time (x, y, weight)
            // Count: represents how good that state is (almost like a rating)
            for (const [stateKey, count] of dp[i - 1].entries()) {
                const [x_available, y_available, available_weight] = Robot.parseStateKey(stateKey);

                const existing_skip = dp[i].has(stateKey) ? dp[i].get(stateKey) : -1;
                if (count > existing_skip) {
                    dp[i].set(stateKey, count);
                    parent[i].set(stateKey, { previousStateKey: stateKey, orientation: null });
                }

                // Try each orientation for each item
                for (const orientation of orientation_map[i - 1]) {
                    const [x_dim, y_dim, z_dim] = orientation;
                    if (
                        item.weight <= available_weight &&
                        x_dim <= x_available &&
                        y_dim <= y_available &&
                        z_dim <= this.z_dim
                    ) {
                        // An acceptable item means you must calculate the next available space
                        const next_state = [
                            x_available - x_dim,
                            y_available - y_dim,
                            available_weight - item.weight,
                        ];

                        // Calculate the next count and determine if this set of items
                        // and orientation is better
                        const nextStateKey = Robot.stateKey(next_state);
                        const next_count = count + 1;
                        const existing_take = dp[i].has(nextStateKey) ? dp[i].get(nextStateKey) : -1;
                        if (next_count > existing_take) {
                            dp[i].set(nextStateKey, next_count);
                            parent[i].set(nextStateKey, { previousStateKey: stateKey, orientation });
                        }
                    }
                }
            }
        }

        // Get the best state so that we can go backwards and build the contained_items list
        // The very end of dp stores a dictionary with possible states, but iteration is necessary
        // to determine the best state. Find the max, find the state
        const best_states = dp[item_count];
        let best_state_key = null;
        let best_count = -1;
        for (const [stateKey, count] of best_states.entries()) {
            if (count > best_count) {
                best_count = count;
                best_state_key = stateKey;
            }
        }

        // Go backwards and plan out the items that were chosen
        const selected_plan = [];
        const unstored_items = [];
        let current_state_key = best_state_key;
        for (let i = item_count; i > 0; i -= 1) {
            const entry = parent[i].get(current_state_key);
            const item = item_list[i - 1];

            // If orientation is valid, then add to plan, else add to unstored
            if (entry.orientation !== null) {
                selected_plan.push([i - 1, entry.orientation]);
            } else {
                unstored_items.push(item);
            }

            // Update state to the previous state (backwards logic)
            current_state_key = entry.previousStateKey;
        }

        // Go forward storing the items you found in the selected plan
        for (const [i, orientation] of selected_plan.reverse()) {
            const item = item_list[i];
            if (!this.storeItem(item, orientation)) {
                unstored_items.push(item);
            }
        }

        return unstored_items;
    }

    async getPath(starting_x=0, starting_y=0) {
        /* Implements OSRM API logic for getting the quickest path between items */
        if (this.contained_items.length <= 1) {
            return [...this.contained_items];
        }

        const coords = [[starting_x, starting_y]];
        for (const item of this.contained_items) {
            coords.push([item.x_loc, item.y_loc]);
        }

        const coordString = coords.map(([x, y]) => `${x},${y}`).join(";");
        const url = `https://router.project-osrm.org/trip/v1/driving/${coordString}?source=first&roundtrip=false&steps=false&overview=false`;
        const data = await Robot.fetchJson(url);

        if (!data.waypoints || data.waypoints.length !== coords.length) {
            throw new Error("OSRM did not return a valid waypoint ordering.");
        }

        return data.waypoints
            .map((waypoint, inputIndex) => ({ inputIndex, waypointIndex: waypoint.waypoint_index }))
            .filter((waypoint) => waypoint.inputIndex !== 0)
            .sort((left, right) => left.waypointIndex - right.waypointIndex)
            .map((waypoint) => this.contained_items[waypoint.inputIndex - 1]);
    }

    static stateKey(state) {
        return state.join(",");
    }

    static parseStateKey(stateKey) {
        return stateKey.split(",").map(Number);
    }

    static async fetchJson(url) {
        const response = await fetch(url, {
            headers: {
                "Accept": "application/json",
                "User-Agent": "R3AI-Robot/1.0",
            },
        });

        const body = await response.json();
        if (!response.ok) {
            const message = body.message || body.code || `status ${response.status}`;
            throw new Error(`OSRM request failed: ${message}.`);
        }

        return body;
    }
}

Robot.randomInt = function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
};

module.exports = Robot;

if (require.main === module) {
    (async () => {
        const item_list = [];
        for (let i = 0; i < 10; i += 1) {
            const item = new Item(
                Robot.randomInt(1, 9),
                Robot.randomInt(1, 9),
                Robot.randomInt(1, 4),
                Robot.randomInt(1, 9),
                Robot.randomInt(1, 9),
                Robot.randomInt(1, 9),
            );
            item_list.push(item);
        }

        const robot = new Robot(15, 15, 3, 20, 100);

        const uncontained_items = robot.storeItems(item_list);
        console.log("Before:");
        for (const item of item_list) {
            console.log(`\t${item.toString()}`);
        }
        console.log("\nAfter:");
        console.log("Unstored:");
        for (const item of uncontained_items) {
            console.log(`\t${item.toString()}`);
        }
        console.log("Stored:");
        for (const item of robot.contained_items) {
            console.log(`\t${item.toString()}`);
        }
        console.log("Robot state:");
        console.log(robot.toString());

        try {
            const pickupOrder = await robot.getPath();
            console.log("Pickup order:");
            for (const item of pickupOrder) {
                console.log(`\t${item.toString()}`);
            }
        } catch (error) {
            console.log(`OSRM route lookup failed: ${error.message}`);
        }
    })();
}
