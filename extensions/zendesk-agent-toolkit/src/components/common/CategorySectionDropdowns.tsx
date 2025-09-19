import React from "react";
import { Form } from "@raycast/api";

interface Category {
  id: number;
  name: string;
}

interface Section {
  id: number;
  name: string;
}

interface CategorySectionDropdownsProps {
  categories: Category[];
  sections: Section[];
  selectedCategoryId: string;
  selectedSectionId: string;
  onCategoryChange: (value: string) => void;
  onSectionChange: (value: string) => void;
  categoryTitle?: string;
  sectionTitle?: string;
  categoryPlaceholder?: string;
  sectionPlaceholder?: string;
}

export function CategorySectionDropdowns({
  categories,
  sections,
  selectedCategoryId,
  selectedSectionId,
  onCategoryChange,
  onSectionChange,
  categoryTitle = "Category",
  sectionTitle = "Section",
  categoryPlaceholder = "Select a category...",
  sectionPlaceholder = "Select a section...",
}: CategorySectionDropdownsProps) {
  return (
    <>
      <Form.Dropdown
        id="category"
        title={categoryTitle}
        placeholder={categoryPlaceholder}
        value={selectedCategoryId}
        onChange={onCategoryChange}
      >
        <Form.Dropdown.Item value="" title="Select Category..." />
        {categories.map((category) => (
          <Form.Dropdown.Item value={category.id.toString()} title={category.name} />
        ))}
      </Form.Dropdown>

      <Form.Dropdown
        id="section"
        title={sectionTitle}
        placeholder={selectedCategoryId ? sectionPlaceholder : "Select a category first"}
        value={selectedSectionId}
        onChange={onSectionChange}
        isLoading={Boolean(selectedCategoryId) && sections.length === 0}
      >
        <Form.Dropdown.Item value="" title="Select Section..." />
        {sections.map((section) => (
          <Form.Dropdown.Item value={section.id.toString()} title={section.name} />
        ))}
      </Form.Dropdown>
    </>
  );
}
