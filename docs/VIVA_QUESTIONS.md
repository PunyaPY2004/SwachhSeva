# Common Viva Questions & Answers

## Project understanding

**Q: What problem does this project solve?**
A: Civic issues like potholes or garbage often go unreported, or take a
long time to reach the right department when reported informally.
SwachhSeva lets any citizen report an issue in seconds from their phone,
automates classification and department routing, and gives both the
citizen and the local authority a way to track progress against a
deadline.

**Q: Who are the users?**
A: Three roles — citizens (report and track issues), officers (review,
classify, and resolve complaints in their department), and admins (see
everything across all departments, plus statistics).

**Q: Walk me through the full flow of a single complaint.**
A: Citizen takes a photo → app captures GPS → submits to the backend →
backend runs the photo through the AI model → if confidence is high
enough, the system auto-assigns a department and SLA deadline; if not,
it's marked Pending Review → an officer sees it on the dashboard,
confirms/corrects the classification if needed, updates status as work
progresses → officer uploads a resolution photo and marks it Resolved →
the citizen's app reflects that immediately.

## AI / ML

**Q: What is MobileNetV2?**
A: A convolutional neural network architecture designed to be
lightweight and efficient (originally for mobile devices), using
depthwise separable convolutions to reduce computation compared to
standard CNNs, while still achieving strong image classification accuracy.

**Q: What is transfer learning?**
A: Instead of training a neural network from scratch (which needs huge
amounts of data), we start from a model already trained on a large
dataset (ImageNet, 1.4 million images) and reuse its learned features —
edges, textures, shapes — then train only a small new classification
head on our specific 5 categories. This works well even with a
relatively small dataset.

**Q: Why did you freeze the base layers initially?**
A: The base layers already contain useful general-purpose visual
features from ImageNet; freezing them prevents destroying that learned
knowledge with large gradient updates early in training, when the new
classification head's weights are still random and noisy. We
unfreeze and fine-tune the top layers afterward, at a much lower
learning rate, once the head has stabilized.

**Q: What does the confidence score mean?**
A: It's the model's own softmax probability for its top predicted
class — essentially, how sure the model is. It's not a guarantee of
correctness, just the model's self-reported certainty.

**Q: Why 60% as the confidence threshold?**
A: A balance point — strict enough to filter out genuinely uncertain
predictions (which risk misrouting a complaint to the wrong department),
loose enough that most reasonably confident predictions still get
automated instead of burdening officers with manual review for
everything.

**Q: What happens below the threshold?**
A: The complaint isn't auto-routed. Status becomes "Pending Review" and
a human officer manually selects the correct issue type through the
dashboard, which then triggers the same department/SLA routing logic.

**Q: How did you evaluate the model?**
A: On a held-out test set — a portion of the dataset the model never
saw during training or validation — computing accuracy, precision,
recall, and F1-score (both macro-averaged and weighted), plus a
confusion matrix to see which classes get confused with each other.

**Q: What's the difference between precision and recall?**
A: Precision asks: of everything the model labeled "pothole," what
fraction actually were potholes? Recall asks: of all the actual
potholes in the test set, what fraction did the model correctly catch?
A model can have high precision but low recall (very cautious, misses
many) or the reverse (catches everything, but with false alarms too).

**Q: Why didn't you train from scratch?**
A: Training a CNN from scratch typically needs tens of thousands of
labeled images per class to reach good accuracy. Our dataset is far
smaller, so training from scratch would badly overfit. Transfer
learning is the standard, appropriate approach for a dataset this size.

**Q: What's Demo Mode?**
A: If no trained model file is present (or it fails to load), the
backend explicitly reports this rather than faking a prediction — the
complaint is marked Pending Review for manual classification instead.
This was a deliberate design choice: the system should never present a
fabricated AI result as if it were real.

## Backend / architecture

**Q: Why Flask instead of Django?**
A: Flask is lighter-weight and less opinionated, which suits a
project of this scope well — we only need a REST API, not Django's
built-in admin panel, templating engine, or ORM conventions. SQLAlchemy
gives us similar ORM capability without Django's larger footprint.

**Q: How is authentication handled?**
A: JWT (JSON Web Tokens) via Flask-JWT-Extended. On login, the server
issues a signed token containing the user's ID and role. Every
subsequent request includes this token in the Authorization header; the
server verifies its signature and reads the role from it to authorize
actions, without needing to store server-side session state.

**Q: How do you prevent a citizen from accessing another citizen's data, or an officer's endpoints?**
A: Every complaint-listing endpoint filters by the authenticated user's
ID (citizens only see complaints where `citizen_id` matches their own).
Officer/admin-only endpoints use a role-checking decorator that inspects
the JWT's role claim and rejects the request with a 403 if it doesn't match.

**Q: What is a JWT and how does it stay secure?**
A: A JSON Web Token is a signed (not encrypted) piece of data — anyone
can read its contents, but only the server (which holds the secret key)
can produce a valid signature for it. If a token is tampered with, the
signature check fails and the server rejects it.

**Q: How does department routing work technically?**
A: A fixed dictionary in the backend config maps each issue type to a
department name and an SLA in days. Once an issue type is confirmed
(either by AI with high confidence, or manually by an officer), the
system looks up that mapping and calculates the deadline as
`now + SLA days`.

**Q: What database relationships exist?**
A: A `User` has many `Complaint`s (via `citizen_id`), and a `Complaint`
optionally references an `assigned_officer_id`, also a `User`. Both are
foreign keys enforced at the database level.

## General / practical

**Q: Why GPS instead of a typed address?**
A: GPS gives an exact, unambiguous location automatically, without
relying on the citizen typing an accurate address — much faster to
submit and more reliable for officers navigating to the site.

**Q: What would you improve with more time?**
A: A larger and more India-representative training dataset (especially
for underrepresented categories like blocked drains), push
notifications so citizens don't have to check the app manually,
PostGIS-based proximity queries (e.g. "show nearby similar complaints"
to detect duplicates), and automated SLA-overdue notifications via a
background job (Celery/Redis, as noted in the original project scope).

**Q: How would this scale to a real city deployment?**
A: The architecture would hold up reasonably well, but production
deployment would need HTTPS, a managed PostgreSQL instance, object
storage for images (S3-style) instead of local disk, rate limiting, and
almost certainly a much larger and continuously-updated training
dataset with a proper MLOps retraining pipeline as new data comes in.
