# R3 AI

R3 AI is a simulation software that focuses on simulating a robot picking up trash to gather simulated data on pollution and performance.

The R3 AI trash collector project focuses on three main points:
* Recognize -> The simulation recognizes trash that are placed at random and builds a navigation route that is most efficient for identifying and collecting trash.
* Recover -> The simulation make a robot go and pick up the trash, recovering the trash and the environment.
* Restore -> By picking up the trash, the simulation simulates a robot restoring the local community environment.

Our software focuses on simulating a robot collecting trash that is placed at random locations around the world. These locations will be specified by pinpointing some areas and placing a robot with random simulated trash. 

The simulation generates pollution and robot performance data, allowing users to see the areas where there's large amounts of trash due to any kind of pollution and interpret how well the robot is performing in these simulated areas. This data is useful to identify areas where trash accumulates so that people can act on it and to determine the robot performance based on how well it tracked trash and how well it runs over time.

**Recognize**
The software will have a robot conduct a scan of the area it's in. It will identify all found trash using YOLO AI and generate its own local map so that a backend logic (insert what is the name of the function that make an optimized path, e.g. knapsack problem) can tell the robot what path to take that is most efficient and collects the most amount of trash.

**Recover**
Once the robot has a path to take, the robot will take that path and collect the trash it identified. It will take into account its own capacity, how big the trash is, and the estimated weight of the trash. The backend logic will use tabulation to determine how many items and much weight the robot will store. As it follows its path, the robot will still scan for more trash, not 

**Restore**
The software will then calculate the efficiency of the robot and calculate how much more the robot improved the environment using pollution metrics.
