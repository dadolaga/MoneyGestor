const AddForm = ({ onClose }) => {
    return (
      <form>
        <h2>Add New Item</h2>
        <label htmlFor="name">Name:</label>
        <input type="text" id="name" name="name" /><br /><br />
        <label htmlFor="description">Description:</label>
        <input type="text" id="description" name="description" /><br /><br />
        <input type="submit" value="Add" />
        <button onClick={onClose}>Close</button>
      </form>
    );
  };
  export default AddForm;