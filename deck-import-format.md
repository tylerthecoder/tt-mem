# Deck Import JSON Format

To import cards into a new deck, you need to provide a JSON array containing the card objects.

The JSON should be an array `[]` where each element is an object `{}` representing a single card.

Each card object **must** have the following two keys:

- `"front"`: (String) The text for the front of the card. Cannot be empty.
- `"back"`: (String) The text for the back of the card. Cannot be empty.

**Example:**

```json
[
  {
    "front": "What is the capital of France?",
    "back": "Paris"
  },
  {
    "front": "What is 2 + 2?",
    "back": "4"
  },
  {
    "front": "Translate 'hello' to Spanish.",
    "back": "Hola"
  }
]
```

**Notes:**

- The deck name will be specified separately in the import UI.
- Ensure the pasted text is valid JSON and conforms exactly to this structure (an array of objects with non-empty `front` and `back` string properties).
- Extra keys within the card objects will be ignored during import.
