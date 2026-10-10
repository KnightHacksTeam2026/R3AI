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
        const start_state = [
            this.x_available,
            this.y_available,
            this.available_weight,
        ];

        const orientation_map = item_list.map((item) => item.orientations());
        const item_count = item_list.length;

        const dp = Array.from({ length: item_count + 1 }, () => new Map());
        const parent = Array.from({ length: item_count + 1 }, () => new Map());
        dp[0].set(Robot.stateKey(start_state), 0);

        for (let i = 1; i <= item_count; i += 1) {
            const item = item_list[i - 1];

            for (const [stateKey, count] of dp[i - 1].entries()) {
                const [x_available, y_available, available_weight] = Robot.parseStateKey(stateKey);

                const existing_skip = dp[i].has(stateKey) ? dp[i].get(stateKey) : -1;
                if (count > existing_skip) {
                    dp[i].set(stateKey, count);
                    parent[i].set(stateKey, { previousStateKey: stateKey, orientation: null });
                }

                for (const orientation of orientation_map[i - 1]) {
                    const [x_dim, y_dim, z_dim] = orientation;
                    if (
                        item.weight <= available_weight &&
                        x_dim <= x_available &&
                        y_dim <= y_available &&
                        z_dim <= this.z_dim
                    ) {
                        const next_state = [
                            x_available - x_dim,
                            y_available - y_dim,
                            available_weight - item.weight,
                        ];

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

        const best_states = dp[item_count];
        let best_state_key = null;
        let best_count = -1;
        for (const [stateKey, count] of best_states.entries()) {
            if (count > best_count) {
                best_count = count;
                best_state_key = stateKey;
            }
        }

        const selected_plan = [];
        const unstored_items = [];
        let current_state_key = best_state_key;
        for (let i = item_count; i > 0; i -= 1) {
            const entry = parent[i].get(current_state_key);
            const item = item_list[i - 1];

            if (entry.orientation !== null) {
                selected_plan.push([i - 1, entry.orientation]);
            } else {
                unstored_items.push(item);
            }

            current_state_key = entry.previousStateKey;
        }

        for (const [i, orientation] of selected_plan.reverse()) {
            const item = item_list[i];
            if (!this.storeItem(item, orientation)) {
                unstored_items.push(item);
            }
        }

        return unstored_items;
    }

    static stateKey(state) {
        return state.join(",");
    }

    static parseStateKey(stateKey) {
        return stateKey.split(",").map(Number);
    }
}

Robot.randomInt = function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
};

module.exports = Robot;

if (require.main === module) {
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
}
