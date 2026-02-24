import { useEffect, useState } from "react";
import Button from "../../components/button/Button";
import { useCategories } from "../../context/CategoriesContext";
import "./incidents-page.styles.scss";

const IncidentsPage = () => {
  const { ensureCategories, getActive, loading, error } = useCategories();
  const [selectedCategoryId, setSelectedCategoryId] = useState("");

  useEffect(() => {
    ensureCategories("behaviour").catch(() => null);
  }, [ensureCategories]);

  const options = getActive("behaviour");
  const selectedCategory = options.find((item) => item._id === selectedCategoryId);

  return (
    <section className="app-page incidents-page">
      <div className="incidents-page__header">
        <h1>Incidents</h1>
        <Button label="Add Incident" />
      </div>

      <div className="incidents-page__filters">
        <label htmlFor="incident-category-filter">Category</label>
        <select
          id="incident-category-filter"
          onChange={(e) => setSelectedCategoryId(e.target.value)}
          value={selectedCategoryId}
        >
          <option value="">All categories</option>
          {options.map((category) => (
            <option key={category._id} value={category._id}>
              {category.name}
            </option>
          ))}
        </select>
        <p className="incidents-page__filter-state">
          {selectedCategory ? `Filtering by: ${selectedCategory.name}` : "All categories"}
        </p>
      </div>

      <div className="incidents-page__table-scaffold">
        {loading.behaviour ? <p>Loading categories...</p> : null}
        {error ? <p>{error}</p> : null}
        {!loading.behaviour && !error ? (
          <p>Incidents table scaffold ready for category-aware workflows.</p>
        ) : null}
      </div>
    </section>
  );
};

export default IncidentsPage;
