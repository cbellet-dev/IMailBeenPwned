package com.osint.email.model;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

/**
 * Request body for the email investigation endpoint.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class EmailInvestigationRequest {

    private String email;
}
