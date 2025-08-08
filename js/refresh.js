$(document).ready(function() {
    $('.bottom-nav a[href="/"]').click(function(e) {
        e.preventDefault();
        window.location.href = '/';
    });
});