import { afterEach, describe, expect, test } from "bun:test";
import { act, cleanup, fireEvent, render } from "@testing-library/react";
import { Carousel } from "@/components/motion/carousel";
import {
  DataTable,
  type DataTableColumn,
  nextSortStack,
} from "@/components/motion/table/data-table";

type Row = { id: string; name: string; team: string; score: number };

const DATA: Row[] = Array.from({ length: 12 }, (_, i) => ({
  id: `r${i}`,
  name: `Person ${String(i).padStart(2, "0")}`,
  team: i % 2 ? "Red" : "Blue",
  score: (i * 7) % 10,
}));

const COLUMNS: DataTableColumn<Row>[] = [
  { key: "name", header: "Name", sortable: true, filter: "text" },
  { key: "team", header: "Team", sortable: true, filter: "select" },
  { key: "score", header: "Score", sortable: true },
];

const bodyNames = (container: HTMLElement) =>
  [...container.querySelectorAll("tbody tr td:first-child")].map(
    (td) => td.textContent,
  );

afterEach(cleanup);

describe("nextSortStack", () => {
  test("plain click cycles one column, shift adds secondary keys", () => {
    let s = nextSortStack([], "a", false);
    expect(s).toEqual([{ key: "a", direction: "asc" }]);
    s = nextSortStack(s, "b", true);
    expect(s).toEqual([
      { key: "a", direction: "asc" },
      { key: "b", direction: "asc" },
    ]);
    s = nextSortStack(s, "b", true);
    expect(s[1]).toEqual({ key: "b", direction: "desc" });
    s = nextSortStack(s, "b", true);
    expect(s).toEqual([{ key: "a", direction: "asc" }]);
    s = nextSortStack(s, "a", false);
    expect(s).toEqual([{ key: "a", direction: "desc" }]);
    expect(nextSortStack(s, "a", false)).toEqual([]);
  });
});

describe("DataTable", () => {
  test("paginates, searches and multi-sorts", () => {
    const { container, getByLabelText, getByText } = render(
      <DataTable data={DATA} columns={COLUMNS} getRowId={(r) => r.id} pageSize={5} />,
    );
    expect(bodyNames(container)).toHaveLength(5);
    expect(getByText("1–5 of 12")).toBeTruthy();

    fireEvent.change(getByLabelText("Search rows"), {
      target: { value: "person 1" },
    });
    expect(bodyNames(container)).toEqual(["Person 10", "Person 11"]);

    fireEvent.change(getByLabelText("Search rows"), { target: { value: "" } });
    fireEvent.click(getByText("Team"));
    fireEvent.click(getByText("Score"), { shiftKey: true });
    const names = bodyNames(container);
    // Blue (even ids) first, then score ascending within Blue.
    expect(names.slice(0, 3)).toEqual(["Person 00", "Person 10", "Person 06"]);
    expect(getByText("Team").closest("th")?.getAttribute("aria-sort")).toBe(
      "ascending",
    );
  });

  test("shift-click selects a range and shows the count bar", () => {
    const { getByLabelText, getByText } = render(
      <DataTable
        data={DATA}
        columns={COLUMNS}
        getRowId={(r) => r.id}
        getRowLabel={(r) => r.name}
        selectable
        pageSize={0}
      />,
    );
    fireEvent.click(getByLabelText("Select Person 01"));
    fireEvent.click(getByLabelText("Select Person 04"), { shiftKey: true });
    expect(getByText("selected")).toBeTruthy();
    for (const n of ["01", "02", "03", "04"]) {
      expect(
        getByLabelText(`Select Person ${n}`).getAttribute("aria-checked"),
      ).toBe("true");
    }
    expect(
      getByLabelText("Select Person 05").getAttribute("aria-checked"),
    ).toBe("false");
  });

  test("expands a row and hides a column", () => {
    const { getByLabelText, queryByText } = render(
      <DataTable
        data={DATA.slice(0, 3)}
        columns={COLUMNS}
        getRowId={(r) => r.id}
        getRowLabel={(r) => r.name}
        renderExpanded={(r) => <p>Detail for {r.name}</p>}
        defaultHiddenColumns={["score"]}
      />,
    );
    expect(queryByText("Score")).toBeNull();
    const toggle = getByLabelText("Expand Person 00");
    fireEvent.click(toggle);
    expect(toggle.getAttribute("aria-expanded")).toBe("true");
    expect(queryByText("Detail for Person 00")).toBeTruthy();
  });
});

describe("Carousel", () => {
  test("exposes the carousel pattern and moves with buttons and keys", () => {
    const changes: number[] = [];
    const { getByLabelText, getAllByRole } = render(
      <Carousel aria-label="Gallery" onIndexChange={(i) => changes.push(i)}>
        <div>A</div>
        <div>B</div>
        <div>C</div>
      </Carousel>,
    );
    const root = getByLabelText("Gallery");
    expect(root.getAttribute("aria-roledescription")).toBe("carousel");
    const slides = getAllByRole("group");
    expect(slides).toHaveLength(3);
    expect(slides[0].getAttribute("aria-roledescription")).toBe("slide");
    expect(slides[1].hasAttribute("inert")).toBe(true);

    act(() => {
      fireEvent.click(getByLabelText("Next slide"));
    });
    expect(changes).toEqual([1]);
    act(() => {
      fireEvent.keyDown(getByLabelText("Go to slide 2"), { key: "ArrowRight" });
    });
    expect(changes).toEqual([1, 2]);
    expect(
      getByLabelText("Go to slide 3").getAttribute("aria-current"),
    ).toBe("true");
  });

  test("loop wraps from the last slide to the first", () => {
    const changes: number[] = [];
    const { getByLabelText } = render(
      <Carousel loop defaultIndex={3} onIndexChange={(i) => changes.push(i)}>
        <div>A</div>
        <div>B</div>
        <div>C</div>
        <div>D</div>
      </Carousel>,
    );
    act(() => {
      fireEvent.click(getByLabelText("Next slide"));
    });
    expect(changes).toEqual([0]);
  });
});
