# How to add, edit and delete expenses

> **For developers:** [Expense Management implementation](../dev/expense-management-implementation.md) · **All guides:** [Documentation home](../README.md)

Record every purchase or bill in a few seconds, fix mistakes, and remove anything you don't need.

---

## Add an expense

1. Click **Add expense** in the top-right corner.
   On a phone, tap the round **+** button in the middle of the bottom bar.

   ![The Add expense button in the top navigation bar](../images/expense-management/add-button.png)

2. Fill in the form:
   - **Description:** what it was, e.g. *Weekly groceries* (up to 100 characters)
   - **Amount:** in dollars, e.g. `42.50`
   - **Date:** today by default; click the field to pick another day
   - **Category:** Food, Transportation, Entertainment, Shopping, Bills or Other

   ![The Add expense form filled in](../images/expense-management/add-form.png)

3. Click **Add expense**. A confirmation appears in the corner, and the expense shows up at the top of your list.

   ![Confirmation message after adding an expense](../images/expense-management/added-toast.png)

> **Tip:** Press **Esc** or click outside the form to close it without saving.

## Edit an expense

1. Find the expense on the **Dashboard** (under *Recent expenses*) or on the **Expenses** page.
2. Hover over the row and click the **pencil** icon. On a phone, the icon is always visible.

   ![Edit and delete icons on an expense row](../images/expense-management/row-actions.png)

3. Change what you need and click **Save changes**.

## Delete an expense

1. Click the **trash** icon on the expense's row.
2. Check the name and amount in the confirmation box, then click **Delete**.

   ![Delete confirmation dialog](../images/expense-management/delete-confirm.png)

> ⚠️ Deleting can't be undone. If you might want your data back later, [export it to CSV](how-to-csv-export.md) first.

## Fixing form errors

If something isn't right, a red message appears under that field:

| Message | What to do |
|---|---|
| *Description is required.* | Type a short description |
| *Enter a valid amount with up to 2 decimal places.* | Use a plain number such as `12` or `12.99`, without letters or extra decimals |
| *Amount must be greater than zero.* | Enter an amount above $0 |
| *Amount can't exceed $1,000,000.* | Split very large amounts into separate expenses |
| *Date can't be in the future.* | Pick today or an earlier date |
| *Choose a category.* | Click one of the six category buttons |

## FAQ

**Can I use a currency other than US dollars?**
Not yet. All amounts are shown in USD.

**Can I create my own categories?**
Not yet. Use **Other** for anything that doesn't fit, and add detail in the description.

**Where is my data saved?**
In your browser, on this device. See [How to keep your data safe](how-to-data-persistence.md).

## Related guides

- [How to search and filter expenses](how-to-expense-search-filtering.md)
- [How to read your dashboard](how-to-dashboard-analytics.md)

---

### Screenshots needed

| File | What to capture |
|---|---|
| `images/expense-management/add-button.png` | Navbar with the **Add expense** button highlighted (desktop) |
| `images/expense-management/add-form.png` | Add expense modal filled in with sample values |
| `images/expense-management/added-toast.png` | Success toast in the bottom-right corner after saving |
| `images/expense-management/row-actions.png` | Expense row on hover with the pencil and trash icons visible |
| `images/expense-management/delete-confirm.png` | Delete confirmation dialog |
