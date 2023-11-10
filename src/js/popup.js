$(function () {
    const $trackingButton = $('#trackingButton');
    const $pauseResumeButton = $('#pauseResumeButton');
    const $taskNameInput = $('#taskName');
    const $tasksList = $('#tasksList');
    const $elapsedTimeDiv = $('#elapsedTime');
    const $timeSpent = $('#timeSpent');
    const $categoryDropdown = $('#categoryDropdown');
    const $subcategoryDropdown = $('#subcategoryDropdown');
    const $categorizationWrapper = $('#categorizationWrapper');

    let isTracking = false;
    let isPaused = false;
    let startTime;
    let pausedTime;
    let taskName;
    let currentTaskId = null;
    let timerInterval;
    let category = '';
    let subcategory = '';

    function formatElapsedTime(elapsedTime) {
        return new Date(elapsedTime).toISOString().substr(11, 8);
    }

    function updateElapsedTime() {
        const elapsedTime = new Date() - new Date(startTime);
        const elapsedTimeFormatted = formatElapsedTime(elapsedTime);
        $timeSpent.text(elapsedTimeFormatted);
    }

    window.updateTasksList = function () {
        chrome.storage.local.get(['tasks'], function (result) {
            $tasksList.empty();
            (result.tasks || []).forEach(task => {
                const elapsedTime = task.endTime ? (new Date(task.endTime) - new Date(task.startTime)) : 0;
                const elapsedTimeFormatted = formatElapsedTime(elapsedTime);
                const taskElement = $(`<li class="list-group-item d-flex justify-content-between align-items-center" data-task-id="${task.id}">
                                        <span>${task.name} - <span class="badge text-bg-light">${elapsedTimeFormatted}</span></span>
                                        <button class="btn btn-danger btn-sm remove-task-btn">&times;</button>
                                      </li>`);
                $tasksList.append(taskElement);
            });
        });
    }

    function startTracking() {
        taskName = $taskNameInput.val().trim();

        if (taskName === '') {
            taskName = prompt(chrome.i18n.getMessage("taskNamePrompt"));
            if (!taskName) {
                alert('Task tracking was not started. Please enter a task name.');
                isTracking = false;
                return;
            }
            $taskNameInput.val(taskName);
        }
        isTracking = true;
        startTime = new Date().toISOString();
        timerInterval = setInterval(updateElapsedTime, 1000);
        $elapsedTimeDiv.show();
        $taskNameInput.prop('disabled', true);
        toggleButtonState(true);
        currentTaskId = Math.random().toString(16).slice(2);
        chrome.action.setIcon({path: "resources/icons/icon-active.png"});
    }

    function stopTracking() {
        const endTime = new Date().toISOString();
        isTracking = false;
        clearInterval(timerInterval);
        $elapsedTimeDiv.hide();
        toggleButtonState(false);

        taskName = $taskNameInput.val();
        chrome.storage.local.get(['tasks'], function (result) {
            const newTasks = result.tasks || [];
            newTasks.unshift({
                id: currentTaskId,
                name: taskName,
                startTime: startTime,
                endTime: endTime,
                category: category,
                subcategory: subcategory
            });
            chrome.storage.local.set({tasks: newTasks}, function () {
                $taskNameInput.val('').prop('disabled', false);
                updateTasksList();
                resetFormState();
                chrome.action.setIcon({path: "resources/icons/icon-inactive.png"});
            });
        });
    }

    function pauseTracking() {
        pausedTime = new Date().toISOString();
        isPaused = true;
        clearInterval(timerInterval);
        $pauseResumeButton.html('<i class="bi bi-play-fill"></i>');
        chrome.action.setIcon({path: "resources/icons/icon-inactive.png"});
    }

    /** The pause/resume button moves the start time to a later time to calculate the right elapsed time subtracting the paused time **/
    function resumeTracking() {
        isPaused = false;
        const currentTime = new Date().getTime();
        const elapsedPausedTime = currentTime - new Date(pausedTime).getTime();
        startTime = new Date(new Date(startTime).getTime() + elapsedPausedTime).toISOString();
        timerInterval = setInterval(updateElapsedTime, 1000);
        $pauseResumeButton.html('<i class="bi bi-pause-fill"></i>');
        chrome.action.setIcon({path: "resources/icons/icon-active.png"});
    }

    window.saveFormState = function() {
        const formState = {
            isTracking,
            taskName,
            startTime,
            category,
            subcategory
        };
        chrome.storage.local.set({formState});
    }

    window.loadFormState = function() {
        chrome.storage.local.get('formState', function (data) {
            if (data.formState) {
                isTracking = data.formState.isTracking || false;
                taskName = data.formState.taskName || '';
                startTime = data.formState.startTime || 0;
                if (isTracking) {
                    $trackingButton.html('<i class="bi bi-stop-fill"></i>');
                    timerInterval = setInterval(updateElapsedTime, 1000);
                    $pauseResumeButton.show();
                    $elapsedTimeDiv.show();
                }
                if (taskName !== '') {
                    $taskNameInput.val(taskName).prop('disabled', true);
                }
                chrome.storage.local.get(['enableCategorization']).then((result) => {
                    if (result.enableCategorization) {
                        category = data.formState.category || '';
                        subcategory = data.formState.subcategory || '';
                        loadCategories(category).then((selectedCategory) => {
                            loadSubcategories(selectedCategory, subcategory).then(selectedSubcategory => {
                            });
                        });
                        $categorizationWrapper.show();
                    } else {
                        category = '';
                        subcategory = '';
                        $categorizationWrapper.hide();
                    }
                });


            }
        });
    }

    function resetFormState() {
        $taskNameInput.val('');
        // $categoryDropdown.prop('selectedIndex', 0);
        // $subcategoryDropdown.prop('selectedIndex', 0);
        isTracking = false;
        taskName = '';
        startTime = 0;
        // category = '';
        // subcategory = ''
        chrome.storage.local.set({formState: {isTracking, taskName, startTime, category, subcategory}});
    }

    function removeTask(taskId) {
        chrome.storage.local.get(['tasks'], function (result) {
            const tasks = result.tasks || [];
            const updatedTasks = tasks.filter(task => task.id !== taskId);
            chrome.storage.local.set({tasks: updatedTasks}, function () {
                updateTasksList();
            });
        });
    }

    function loadCategories(selectedCategory = undefined) {
        const addedCategories = new Set(); // Create a Set to store the added categories
        $categoryDropdown.empty();
        return new Promise((resolve)  => {
            chrome.storage.local.get(['categories', 'subcategories'], function (result) {
                result.categories.forEach(category => {
                    if (!addedCategories.has(category.label)) { // Check if category has already been added
                        const value = convertToDropdownValue(category.label);
                        const optionElement = $(`<option value="${value}">${category.label}</option>`);
                        $categoryDropdown.append(optionElement);
                        addedCategories.add(category.label); // Add category to the Set
                    }
                });
                result.subcategories.forEach(subcategory => {
                    if (!addedCategories.has(subcategory.parent)) { // Check if parent has already been added
                        const value = convertToDropdownValue(subcategory.parent);
                        const optionElement = $(`<option value="${value}">${subcategory.parent}</option>`);
                        $categoryDropdown.append(optionElement);
                        addedCategories.add(subcategory.parent); // Add parent to the Set
                    }
                });
                if (selectedCategory) {
                    $categoryDropdown.val(convertToDropdownValue(selectedCategory));
                } else {
                    $categoryDropdown.prop('selectedIndex', 0);
                    category = selectedCategory = $categoryDropdown.find('option').first().text();
                }
                // $categoryDropdown.trigger('change');
                resolve(selectedCategory);
            })
        });
    }

    async function loadSubcategories(parentCategory, selectedSubcategory) {
        return new Promise((resolve) => {
            chrome.storage.local.get(['subcategories'], function (result) {
                const subcategories = result.subcategories || [];
                const filteredSubcategories = subcategories.filter(subcategory => subcategory.parent === parentCategory);
                $subcategoryDropdown.empty();
                filteredSubcategories.forEach(subcategory => {
                    const value = convertToDropdownValue(subcategory.label);
                    const optionElement = $(`<option value="${value}">${subcategory.label}</option>`);
                    $subcategoryDropdown.append(optionElement);
                });
                if (selectedSubcategory) {
                    $subcategoryDropdown.val(convertToDropdownValue(selectedSubcategory));
                } else {
                    $subcategoryDropdown.prop('selectedIndex', 0);
                    subcategory = selectedSubcategory = $subcategoryDropdown.find('option').first().text();
                }
                // $subcategoryDropdown.trigger('change');
                resolve(selectedSubcategory);
            });
        })

    }

    function handleCategoryChange() {
        category = $categoryDropdown.find('option').eq($categoryDropdown.prop('selectedIndex')).text();
        if (category !== '') {
            loadSubcategories(category);
        } else {
            $categorizationWrapper.hide();
            subcategory = '';
        }
    }

    function handleSubcategoryChange() {
        subcategory = $subcategoryDropdown.find('option').eq($subcategoryDropdown.prop('selectedIndex')).text()
    }

    function convertToDropdownValue(value) {
        if (value === '' || value === undefined)
            return '';
        const sanitizedValue = value.replace(/[^a-zA-Z0-9-]/g, '');
        return sanitizedValue.toLowerCase();
    }

    const toggleButtonState = (isTracking) => {
        $trackingButton.html(isTracking ? '<i class="bi bi-stop-fill"></i>' : '<i class="bi bi-play-fill"></i>');
        $pauseResumeButton.toggle(isTracking);
    };

    $trackingButton.on('click', () => isTracking ? stopTracking() : startTracking());
    $pauseResumeButton.on('click', () => isPaused ? resumeTracking() : pauseTracking());

    $categoryDropdown.on('change', handleCategoryChange);
    $subcategoryDropdown.on('change', handleSubcategoryChange);

    $taskNameInput.on('keyup', function (e) {
        if (e.key === 'Enter' && !isTracking) {
            startTracking();
        }
    });

    $tasksList.on('click', '.remove-task-btn', function () {
        const taskId = $(this).closest('li').data('task-id');
        removeTask(taskId);
    });


    // Load the current tracking state from storage
    loadFormState();

    // Save the state before losing focus
    window.onblur = saveFormState;

    updateTasksList();
});