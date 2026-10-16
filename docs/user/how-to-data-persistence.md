# How to keep your data safe

> **For developers:** [Data Persistence implementation](../dev/data-persistence-implementation.md) · **All guides:** [Documentation home](../README.md)

Spendwise saves your expenses automatically, but only in **this browser on this device**. Here's what that means and how to protect your data.

---

## Where your data is saved

- Every change is saved instantly; there's no Save button.
- Data stays in your browser. Nothing is uploaded anywhere.
- Each browser keeps its **own separate copy**. Chrome and Edge, or your laptop and your phone, won't see each other's expenses.
- If you have Spendwise open in two tabs, changes in one show up in the other automatically.

## Things that will erase your data

| Action | Effect |
|---|---|
| Clearing your browser's history or **site data** | All expenses for Spendwise are deleted |
| Using a private or incognito window | Expenses vanish when the window closes |
| Switching to a different browser or computer | You'll start with an empty list there |

## Keep a backup

Export your expenses regularly:

1. On the **Dashboard**, click **Export…**.
2. Choose **JSON** (a complete copy) or **CSV** (for spreadsheets), leave **All time** and all categories selected, and click **Export**.
3. Keep the downloaded file somewhere safe, such as your cloud drive.

See [How to export your expenses](how-to-data-export.md).

## Try Spendwise with sample data

Want to explore before entering your own expenses?

1. With an empty list, open the **Dashboard** or **Expenses** page.
2. Click **Load sample data**.

   ![Empty state with the Load sample data button](../images/data-persistence/empty-state.png)

About three months of realistic expenses appear, so you can try the charts, filters and export.

> **Start fresh after trying sample data:** in your browser, open **Developer Tools → Application → Local Storage**, delete the `expense-tracker:expenses:v1` entry, and refresh. There's no in-app reset yet.

## Troubleshooting

**A red banner says "We couldn't read your saved expenses".**
The saved data was damaged. Spendwise starts with an empty list. If you need to try recovering it, ask for help **before** adding anything new, because the next change replaces the damaged data.

**"Couldn't save to local storage".**
Your browser's storage is full or blocked, which is common in private windows. Your changes work for now but won't survive closing the tab. Export your expenses, then check your browser's privacy settings.

## Related guides

- [How to export your expenses](how-to-data-export.md)
- [How to add, edit and delete expenses](how-to-expense-management.md)

---

### Screenshots needed

| File | What to capture |
|---|---|
| `images/data-persistence/empty-state.png` | Empty dashboard with **Add your first expense** and **Load sample data** |
