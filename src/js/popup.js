$(function() {
    const $trackingButton = $('#trackingButton');
    const $pauseResumeButton = $('#pauseResumeButton');
    const $taskNameInput = $('#taskName');
    const $tasksList = $('#tasksList');
    const $elapsedTimeDiv = $('#elapsedTime');
    const $timeSpent = $('#timeSpent');

    let isTracking = false;
    let isPaused = false;
    let startTime;
    let pausedTime;
    let taskName;
    let currentTaskId = null;
    let timerInterval;

    function formatElapsedTime(elapsedTime) {
        return new Date(elapsedTime).toISOString().substr(11, 8);
    }

    function updateElapsedTime() {
        const elapsedTime = new Date() - new Date(startTime);
        const elapsedTimeFormatted = formatElapsedTime(elapsedTime);
        $timeSpent.text(elapsedTimeFormatted);
    }

    window.updateTasksList = function() {
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
        $trackingButton.html('<i class="bi bi-stop-fill"></i>');
        $pauseResumeButton.show();
        currentTaskId = Math.random().toString(16).slice(2);
        chrome.action.setIcon({path: "resources/icons/icon-active.png"});
    }

    function stopTracking() {
        const endTime = new Date().toISOString();
        isTracking = false;
        clearInterval(timerInterval);
        $elapsedTimeDiv.hide();
        $trackingButton.html('<i class="bi bi-play-fill"></i>');
        $pauseResumeButton.hide();

        taskName = $taskNameInput.val();
        chrome.storage.local.get(['tasks'], function (result) {
            const newTasks = result.tasks || [];
            newTasks.unshift({
                id: currentTaskId,
                name: taskName,
                startTime: startTime,
                endTime: endTime
            });
            chrome.storage.local.set({ tasks: newTasks }, function () {
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

    function toggleTracking() {
        if (isTracking) {
            stopTracking();
        } else {
            startTracking();
        }
    }

    function togglePause() {
        if (isTracking) {
            if (isPaused) {
                resumeTracking();
            } else {
                pauseTracking();
            }
        }
    }

    function saveFormState() {
        const formState = {
            isTracking,
            taskName,
            startTime
        };
        chrome.storage.local.set({formState});
    }

    function loadFormState() {
        chrome.storage.local.get('formState', function (data) {
            if (data.formState) {
                isTracking = data.formState.isTracking || false;
                taskName = data.formState.taskName || '';
                startTime = data.formState.startTime || 0;
                if (isTracking) {
                    $trackingButton.html('<i class="bi bi-stop-fill"></i>');
                    timerInterval = setInterval(updateElapsedTime, 1000);
                    $elapsedTimeDiv.show();
                }
                if (taskName !== '') {
                    $taskNameInput.val(taskName).prop('disabled', true);
                }
            }
        });
    }

    function resetFormState() {
        $taskNameInput.val('');
        isTracking = false;
        taskName = '';
        startTime = 0;
        chrome.storage.local.set({formState: {isTracking, taskName, startTime}});
    }

    function removeTask(taskId) {
        chrome.storage.local.get(['tasks'], function (result) {
            const updatedTasks = result.tasks.filter(task => task.id !== taskId);
            chrome.storage.local.set({ tasks: updatedTasks }, updateTasksList);
        });
    }

    $tasksList.on('click', '.remove-task-btn', function() {
        const taskId = $(this).closest('li').data('task-id');
        removeTask(taskId);
    });

    $trackingButton.on('click', function () {
        toggleTracking();
    });

    $pauseResumeButton.on('click', function () {
        togglePause();
    });


    $taskNameInput.on('keyup', function (e) {
        if (e.key === 'Enter' && !isTracking) {
            startTracking();
        }
    });

    chrome.runtime.onMessage.addListener((request) => {
        debugger;
        if (request.action === "toggle-tracking") {
            toggleTracking();
        }
    });


    updateTasksList(); // Populate the task list on popup open

    // Load the current tracking state from storage
    loadFormState();

    // Save the state before losing focus
    window.onblur = function () {
        saveFormState();
    };



});
