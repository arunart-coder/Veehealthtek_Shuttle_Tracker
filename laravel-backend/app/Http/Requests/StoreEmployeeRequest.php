<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreEmployeeRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        $isPost = $this->isMethod('post');

        return [
            'id' => [
                $isPost ? 'required' : 'nullable',
                'string',
                'max:50',
                Rule::unique('employees', 'id')->ignore($this->route('employee'))
            ],
            'name' => 'required|string|max:150',
            'department' => 'required|string|max:100',
            'gender' => ['required', Rule::in(['M', 'F'])]
        ];
    }
}
