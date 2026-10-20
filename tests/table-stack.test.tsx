import { afterEach, describe, expect, test } from "bun:test";
import { cleanup, fireEvent, render, within } from "@testing-library/react";
import { Table, type TableColumn } from "@/components/motion/table";
import {
  DataTable,
  type DataTableColumn,
} from "@/components/motion/table/data-table";

// happy-dom lays nothing out, so every element measures 0px wide: a
// `mobileLayout="stack"` table is "narrow" unless a test widens it.
const realRect = HTMLElement.prototype.getBoundingClientRect;
function measureAs(width: number) {
  HTMLElement.prototype.getBoundingClientRect = function () {
    return { ...realRect.call(this), width } as DOMRect;
  };
}

// …and 0px tall, so the virtualizer would render no items without a viewport.
const realOffsetHeight = Object.getOwnPropertyDescriptor(
  HTMLElement.prototype,
  "offsetHeight",
);
function viewportHeight(height: number) {
  Object.defineProperty(HTMLElement.prototype, "offsetHeight", {
    configurable: true,
    get: () => height,
  });
}

afterEach(() => {
  cleanup();
  HTMLElement.prototype.getBoundingClientRect = realRect;
  if (realOffsetHeight)
    Object.defineProperty(HTMLElement.prototype, "offsetHeight", realOffsetHeight);
});

type Row = { id: string; name: string; team: string; score: number };

const DATA: Row[] = Array.from({ length: 6 }, (_, i) => ({
  id: `r${i}`,
  name: `Person ${i}`,
  team: i % 2 ? "Red" : "Blue",
  score: i * 3,
}));

const DT_COLUMNS: DataTableColumn<Row>[] = [
  { key: "name", header: "Name", sortable: true, primary: true },
  { key: "team", header: "Team", sortable: true, filter: "select" },
  { key: "score", header: "Score", sortable: true },
  { key: "id", header: "ID", hideOnMobile: true },
];

describe("DataTable mobileLayout", () => {
  test("defaults to the scrolling table, even when narrow", () => {
    const { container } = render(
      <DataTable data={DATA} columns={DT_COLUMNS} getRowId={(r) => r.id} />,
    );
    expect(container.querySelector("table")).toBeTruthy();
    expect(container.querySelector("ul")).toBeNull();
  });

  test("stays a table above stackBelow", () => {
    measureAs(800);
    const { container } = render(
      <DataTable
        data={DATA}
        columns={DT_COLUMNS}
        getRowId={(r) => r.id}
        mobileLayout="stack"
      />,
    );
    expect(container.querySelector("table")).toBeTruthy();
    expect(container.querySelector("ul")).toBeNull();
  });

  test("narrow: one list item per row, headers as labels, no table in the DOM", () => {
    const { container, getByRole } = render(
      <DataTable
        data={DATA}
        columns={DT_COLUMNS}
        getRowId={(r) => r.id}
        mobileLayout="stack"
      />,
    );
    expect(container.querySelector("table")).toBeNull();
    const list = getByRole("list", { name: "Rows" });
    const items = within(list).getAllByRole("listitem");
    expect(items).toHaveLength(6);
    const first = items[0];
    expect(first.textContent).toContain("Person 0");
    const labels = [...first.querySelectorAll("dt")].map((d) => d.textContent);
    // Name is the title, ID is hidden on mobile.
    expect(labels).toEqual(["Team", "Score"]);
    expect(first.querySelector("dd")?.textContent).toBe("Blue");
  });

  test("narrow: sort select, selection and expand keep working", () => {
    const { getByLabelText, getByRole, queryByText } = render(
      <DataTable
        data={DATA}
        columns={DT_COLUMNS}
        getRowId={(r) => r.id}
        getRowLabel={(r) => r.name}
        selectable
        renderExpanded={(r) => <p>Detail for {r.name}</p>}
        mobileLayout="stack"
      />,
    );
    fireEvent.change(getByLabelText("Sort by"), {
      target: { value: "desc:score" },
    });
    const items = within(getByRole("list", { name: "Rows" })).getAllByRole(
      "listitem",
    );
    expect(items[0].textContent).toContain("Person 5");

    fireEvent.click(getByLabelText("Select Person 5"));
    expect(
      getByLabelText("Select Person 5").getAttribute("aria-checked"),
    ).toBe("true");
    fireEvent.click(getByLabelText("Select all"));
    expect(
      getByLabelText("Select Person 0").getAttribute("aria-checked"),
    ).toBe("true");

    const toggle = getByLabelText("Expand Person 5");
    fireEvent.click(toggle);
    expect(toggle.getAttribute("aria-expanded")).toBe("true");
    expect(queryByText("Detail for Person 5")).toBeTruthy();
  });

  test("narrow: filter chips open the column menu", () => {
    const { getByRole, getByText } = render(
      <DataTable
        data={DATA}
        columns={DT_COLUMNS}
        getRowId={(r) => r.id}
        mobileLayout="stack"
      />,
    );
    const chip = getByRole("button", { name: /Team.*column options/ });
    expect(chip.getAttribute("aria-expanded")).toBe("false");
    fireEvent.click(chip);
    expect(chip.getAttribute("aria-expanded")).toBe("true");
    expect(getByText("Filter")).toBeTruthy();
  });
});

const T_COLUMNS: TableColumn<Row>[] = [
  { key: "name", header: "Name", sortable: true, editable: true },
  { key: "team", header: "Team", editable: true },
  { key: "score", header: "Score" },
];

describe("Table mobileLayout", () => {
  test("defaults to the table", () => {
    const { container } = render(
      <Table data={DATA} columns={T_COLUMNS} getRowId={(r) => r.id} />,
    );
    expect(container.querySelector("table")).toBeTruthy();
    expect(container.querySelector("ul")).toBeNull();
  });

  test("narrow: cards keep editable cells and selection", () => {
    viewportHeight(440);
    const edits: [string, string, string][] = [];
    const { container, getAllByRole, getByLabelText } = render(
      <Table
        data={DATA}
        columns={T_COLUMNS}
        getRowId={(r) => r.id}
        selectable
        onCellEdit={(id, key, value) => edits.push([id, key, value])}
        mobileLayout="stack"
      />,
    );
    expect(container.querySelector("table")).toBeNull();
    const items = getAllByRole("listitem");
    expect(items.length).toBeGreaterThan(0);
    expect(items[0].getAttribute("aria-setsize")).toBe("6");
    expect(
      [...items[0].querySelectorAll("dt")].map((d) => d.textContent),
    ).toEqual(["Team", "Score"]);

    fireEvent.change(getByLabelText("team for row 1"), {
      target: { value: "Green" },
    });
    expect(edits).toEqual([["r0", "team", "Green"]]);

    fireEvent.click(getByLabelText("Select row 1"));
    expect(getByLabelText("Select row 1").getAttribute("aria-checked")).toBe(
      "true",
    );
  });
});
