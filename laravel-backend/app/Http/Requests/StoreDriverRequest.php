<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreDriverRequest extends FormRequest
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
            'employee_id' => [
                $isPost ? 'required' : 'nullable',
                'string',
                Rule::unique('drivers', 'employee_id')->ignore($this->route('driver'))
            ],
            'name' => 'required|string|max:150',
            'gender' => ['required', Rule::in(['Male', 'Female', 'Other'])],
            'phone' => 'required|string|max:20',
            'join_date' => 'nullable|date_format:Y-m-d',
            'status' => ['nullable', Rule::in(['Active', 'Inactive'])]
        ];
    }
}
