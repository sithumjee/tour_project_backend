## Data Modeling

#### 1) Types of Relationships between data

- One to One

- One to Many =>

  - One to Few = 1 movie can win many awards
  - One to Many = 1 movie can have many reviews
  - One to Ton = 1 movie can have millions of logs

- Many to Many => A movie can have many actors and an actor can have many movies

#### 2) Referencing (Normalized) vs Embedding (Denormalized)

- Referencing => Data is normalized and references are used to connect the data

  - Pros:
    - Consistency
    - Less duplication
    - Smaller in size
  - Cons: - Need to perform multiple queries to resolve the relationships - No transaction support

- Embedding => Data is denormalized and embedded into a single document
  - Pros:
    - Single query to resolve the relationship
    - Atomicity
  - Cons:
    - Duplications
    - Inconsistency
    - Large in size

![Alt text](image-1.png)

##### When to use Referencing vs Embedding

- One to One => Embed
- One to few => Embed
- One to Many => Reference / Embed (depends on the use case)
- One to Ton => Reference
- Many to Many => Reference
- When data is mostly read => Embed
- When data is mostly write/ updated => Reference

##### Types of Referencing

- Parent Referencing = Error log document has a reference to the app document <span style="color: blue;">(1:many & 1:ton)<span/>
- Child Referencing = The Order document references the Order Items using IDs <span style="color: blue;">(1 : few)
- Two-way Referencing = A movie document has a list of actors and an actor document has a list of movies <span style="color: blue;">(many:many)

![Alt text](image-2.png)

###### \* Here we decided to use <span style="color: red"> referencing </span> for the tours & user , because if the guide associated with the tour is updated then we need to update all the tours associated with that guide. So we decided to use referencing.

- Referencing is done as 2 part process
  - Create a reference
  - Populate the reference - using a query middleware
    ![Alt text](image-3.png)
    ![Alt text](image-4.png)

##### \* In the reviews schema we used parent referencing to both tours and users. But when we query a tour we need to get the related reviews. So here to achieve this we used <span style="color: red"> virtual populate </span> .(we could have used child referencing also but then the reviews array would have been very large) - Refer tourModel.js
