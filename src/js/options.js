$(function () {
    const $enableCategorizationCheckbox = $('#enableCategorizationCheckbox');
    const $categoriesTextareaWrapper = $('#categoriesTextareaWrapper');
    const $categoriesTextarea = $('#categoriesTextarea');
    const $saveButton = $('#saveButton');

    function saveOptions() {
        const enableCategorization = $enableCategorizationCheckbox.is(':checked');
        const inputText = $categoriesTextarea.val();
        const lines = inputText.split('\n');
        const categoriesSet = new Set();
        const subcategoriesSet = new Set();

        lines.forEach(line => {
            const trimmedLine = line.trim();
            if (trimmedLine !== '') {
                const [category, subcategory] = trimmedLine.split('>').map(value => value.trim());

                if (subcategory) {
                    subcategoriesSet.add(JSON.stringify({label: subcategory, parent: category}));
                } else {
                    categoriesSet.add(JSON.stringify({label: category}));
                }
            }
        });

        const categories = Array.from(categoriesSet).map(category => JSON.parse(category));;
        const subcategories = Array.from(subcategoriesSet).map(subcategory => JSON.parse(subcategory));

        chrome.storage.local.set({enableCategorization, categories, subcategories}, function () {
            alert('Options saved successfully!');
        });
    }

    function loadOptions() {
        chrome.storage.local.get(['enableCategorization', 'categories', 'subcategories'], function (result) {
            $enableCategorizationCheckbox.prop('checked', result.enableCategorization || false);
            let outputText = '';
            const categoriesSet = new Set(result.categories);
            result.categories.forEach(category => {
                outputText += `${category.label}\n`;
            });
            result.subcategories.forEach(subcategory => {
                if (!categoriesSet.has(subcategory.parent)) {
                    outputText += `${subcategory.parent} > ${subcategory.label}\n`;
                }
            });
            $categoriesTextarea.val(outputText);
        });
    }

    $enableCategorizationCheckbox.on('click', function(){
        if ($enableCategorizationCheckbox.is(':checked')) {
            $categoriesTextareaWrapper.show();
        } else {
            $categoriesTextareaWrapper.hide();
        }
    });
    $saveButton.on('click', saveOptions);
    loadOptions();
});