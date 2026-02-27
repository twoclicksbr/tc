<?php

use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return view('site.home');
});

Route::get('/login', function () {
    return redirect('http://admin.tc.test:5173/auth/signin');
})->name('login');
