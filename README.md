# R3 AI

R3 AI is a simulation software that focuses on simulating a robot picking up trash to gather simulated data on pollution and performance.

The R3 AI trash collector project focuses on three main points:
* Recognize -> The simulation recognizes trash that are placed at random and builds a navigation route that is most efficient for identifying and collecting trash.
* Recover -> The simulation make a robot go and pick up the trash, recovering the trash and the environment.
* Restore -> By picking up the trash, the simulation simulates a robot restoring the local community environment.

Our software focuses on simulating a robot collecting trash that is placed at random locations around the world. These locations will be specified by pinpointing some areas and placing a robot with random simulated trash. 

The simulation generates pollution and robot performance data, allowing users to see the areas where there's large amounts of trash due to any kind of pollution and interpret how well the robot is performing in these simulated areas. This data is useful to identify areas where trash accumulates so that people can act on it and to determine the robot performance based on how well it tracked trash and how well it runs over time.

**Recognize**

The software will have a robot conduct a scan of the area it's in. It will identify all found trash using YOLO AI and build a list of prioritized trash components that involved a backend logic that solves a multi-dimensional knapsack problem. It will take into account its own capacity, how big the trash is, and the estimated weight of the trash. The backend logic will use tabulation to determine how many items and much weight the robot will store. Once we have the list of prioritized trash, we simulate a navigation system that generates an optimized path using Open-Source Routing Machine (OSRM). This step-by-step process allows the robot to identify trash using a simulated navigation system, determine which trash components the robot is able to handle at a time in an efficient manner, and produce a navigation path that is most optimized using OSRM.

**Recover**

Once the robot has a path to take, the robot will take that path and collect the trash it identified. If there's various amount of trash and the robot cannot handle all this trash at once, it will prioritize the list of items it generated in the first place, then rerun the logic that prioritizes trash using the not stored trash list and collect that trash yet again using the same logic explained before. It will continue this loop, until all trash that the robot was capable of collecting was collected. If there's a piece of trash the robot cannot handle, then the software reports that trash to the dashboard so that a human can pick it up.

**Restore**

The software will then calculate the robot performance, metrics, and battery life. Then, it will calculate how much more the robot improved the environment using pollution metrics. This will be useful since the purpose of the robot is to simulate an AI conducting scans throughout a cycle, searching for trash in specific areas, and calculating the most optimized way to collect the most trash in an efficient path.
