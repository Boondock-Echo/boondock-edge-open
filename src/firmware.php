<?php

// Ensure it's a POST request and contains necessary parameters
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['api_path']) && isset($_FILES['firmware_file'])) {
    // Extract parameters from the request
    $apiPath = $_POST['api_path'];
    $uploadDir = 'firmware/';
    $filename = $_FILES['firmware_file']['name'];
    $uploadFile = $uploadDir . $apiPath . '/' . $filename;

    // Validate and sanitize the API path as needed
    // For security reasons, you should perform proper input validation and sanitation

    // Check if the directory exists, create it if not
    if (!file_exists($uploadDir . $apiPath)) {
        mkdir($uploadDir . $apiPath, 0777, true);
    }

    // Handle file upload
    if (move_uploaded_file($_FILES['firmware_file']['tmp_name'], $uploadFile)) {
        $response = array('status' => 'success', 'message' => 'File uploaded successfully.', 'filename' => $filename);
    } else {
        $response = array('status' => 'error', 'message' => 'Error uploading the file.', 'error_details' => error_get_last());
    }

    // Send JSON response
    header('Content-Type: application/json');
    echo json_encode($response);
} else {
    // Send an error response if the request is not valid
    $response = array('status' => 'error', 'message' => 'Invalid request.', 'error_details' => 'Missing required parameters.');
    
    // Send JSON response
    header('Content-Type: application/json');
    echo json_encode($response);
}

?>
