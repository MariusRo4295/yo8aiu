<?php
header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json');

$allowed = array('image/jpeg','image/png','image/gif','image/webp','video/mp4','video/webm');

if(!isset($_FILES['file'])){
    echo json_encode(array('error'=>'No file'));exit;
}

$mime = mime_content_type($_FILES['file']['tmp_name']);
if(!in_array($mime, $allowed)){
    echo json_encode(array('error'=>'Tip nepermis'));exit;
}

$ext = pathinfo($_FILES['file']['name'], PATHINFO_EXTENSION);
$filename = time().'_'.bin2hex(random_bytes(4)).'.'.$ext;
$dest = __DIR__.'/uploads/'.$filename;

if(move_uploaded_file($_FILES['file']['tmp_name'], $dest)){
    echo json_encode(array('url'=>'https://yo8aiu.ro/uploads/'.$filename));
}else{
    echo json_encode(array('error'=>'Upload failed'));
}
?>
