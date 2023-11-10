$(function () {
    const $exportButton = $('#exportButton');
    const $copyToClipboard = $('#copyToClipboardButton');
    const $clearButton = $('#clearButton');
    const header = 'Task Name,Start Time,End Time,Duration (hours),Duration (minutes),Category,Subcategory';

    function clearAllTasks() {
        if (confirm('Are you sure you want to clear all tasks? This action cannot be undone.')) {
            chrome.storage.local.set({tasks: []}, function () {
                window.updateTasksList();
            });
        }
    }

    function escapeCSV(value) {
        return `"${value.replace(/"/g, '""')}"`;
    }

    function convertToCSVRow(task) {
        const startTime = new Date(task.startTime);
        const endTime = new Date(task.endTime);

        const startTimeString = startTime.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'});
        const endTimeString = endTime.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'});
        const category = task.category;
        const subcategory = task.subcategory;

        const durationInMinutes = Math.round((endTime - startTime) / 1000 / 60);
        const durationInHours = Math.floor(durationInMinutes / 60);
        const remainingMinutes = durationInMinutes % 60;

        return `${escapeCSV(task.name)},${startTimeString},${endTimeString},${durationInHours},${remainingMinutes},${category},${subcategory}`;
    }

    function copyTasksToClipboard() {
        chrome.storage.local.get(['tasks'], (result) => {
            const rows = result.tasks.map(convertToCSVRow);
            const csvContent = [header, ...rows].join('\n');
            navigator.clipboard.writeText(csvContent).then(() => alert('Tasks copied to clipboard.')).catch((error) => console.error('Error copying tasks to clipboard:', error))});
    }

    function exportTasksToCSV() {
        chrome.storage.local.get(['tasks'], (result) => {
            const rows = result.tasks.map(convertToCSVRow);
            const csvContent = ['data:text/csv;charset=utf-8,', header, ...rows].join('\n');
            const encodedUri = encodeURI(csvContent);
            const currentDate = new Date().toISOString().slice(0, 10);
            chrome.downloads.download({
                url: encodedUri,
                filename: `tasks-export_${currentDate}.csv`
            });
        });
    }

    $clearButton.on('click', clearAllTasks);

    $exportButton.on('click', function () {
        exportTasksToCSV();
    });

    $copyToClipboard.on('click', function () {
        copyTasksToClipboard();
    });
});
