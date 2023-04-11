function handleSearch(event) {
    event.preventDefault(); // Prevent form submission
    const searchInput = document.querySelector('input[type="search"]');
    fetchData(searchInput.value);
}

function createAccordionItem(tableHeader, row, index) {
    const item = document.createElement('div');
    item.className = 'accordion-item';

    const header = document.createElement('h2');
    header.className = 'accordion-header';
    item.appendChild(header);

    const button = document.createElement('button');
    button.className = 'accordion-button collapsed';
    button.type = 'button';
    button.dataset.bsToggle = 'collapse';
    button.dataset.bsTarget = `#flush-collapse${index}`;
    button.setAttribute('aria-expanded', 'false');
    button.setAttribute('aria-controls', `flush-collapse${index}`);
    button.textContent = `${row[1]} - ${row[2]}`;
    header.appendChild(button);

    const collapse = document.createElement('div');
    collapse.id = `flush-collapse${index}`;
    collapse.className = 'accordion-collapse collapse';
    collapse.setAttribute('aria-labelledby', `flush-heading${index}`);
    collapse.dataset.bsParent = '#client-accordion';
    item.appendChild(collapse);

    const body = document.createElement('div');
    body.className = 'accordion-body';

    // TABLE
    const table = document.createElement('table');
    table.classList.add('table');
    const tableBody = document.createElement('tbody');
    table.appendChild(tableBody);

    // TABLE HEADER
    const tableRow1 = document.createElement('tr');
    tableRow1.classList.add('table-primary');
    tableBody.appendChild(tableRow1);
    tableHeader.forEach((cellData) => {
        const tableColumn = document.createElement('th');
        tableColumn.setAttribute('scope', 'col');
        tableColumn.textContent = cellData;
        tableRow1.appendChild(tableColumn);
    });

    // TABLE CELL
    const tableRow2 = document.createElement('tr');
    tableRow2.classList.add('table-primary');
    tableBody.appendChild(tableRow2);
    row.forEach((cellData) => {
        const tableColumn = document.createElement('td');
        tableColumn.setAttribute('scope', 'row');
        tableColumn.textContent = cellData;
        tableRow2.appendChild(tableColumn);
    });

    body.appendChild(table);
    collapse.appendChild(body);

    return item;
}


