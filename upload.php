<?php
header('Access-Control-Allow-Origin: https://yo8aiu.ro');
header('Content-Type: application/json');

// Extensia se stabileste DOAR dupa tipul real al fisierului, niciodata dupa numele trimis
// (altfel cineva poate urca "poza.php" cu continut de imagine si serverul l-ar rula).
$allowed = array(
    'image/jpeg' => 'jpg',
    'image/png'  => 'png',
    'image/gif'  => 'gif',
    'image/webp' => 'webp',
    'video/mp4'  => 'mp4',
    'video/webm' => 'webm',
);
$maxBytes = 50 * 1024 * 1024; // 50 MB

if (!isset($_FILES['file']) || $_FILES['file']['error'] !== UPLOAD_ERR_OK) {
    echo json_encode(array('error' => 'No file')); exit;
}
if ($_FILES['file']['size'] > $maxBytes) {
    echo json_encode(array('error' => 'Fisier prea mare')); exit;
}

$mime = mime_content_type($_FILES['file']['tmp_name']);
if (!isset($allowed[$mime])) {
    echo json_encode(array('error' => 'Tip nepermis')); exit;
}

$filename = time() . '_' . bin2hex(random_bytes(4)) . '.' . $allowed[$mime];
$dest = __DIR__ . '/uploads/' . $filename;

if (move_uploaded_file($_FILES['file']['tmp_name'], $dest)) {
    echo json_encode(array('url' => 'https://yo8aiu.ro/uploads/' . $filename));
} else {
    echo json_encode(array('error' => 'Upload failed'));
}
